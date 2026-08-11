import { prisma } from "../lib/prisma";
import { UnauthorizedError, ConflictError } from "../utils/errors";
import { sign, verify, type JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config";
import { slugify } from "../utils/math";
import { audit } from "./auditService";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
}

export interface TokenPayload extends JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  org: string | null;
}

export function signToken(user: AuthUser): string {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    org: user.organizationId,
  };
  return sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function verifyToken(token: string): TokenPayload {
  try {
    return verify(token, config.jwtSecret) as TokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired session");
  }
}

export async function loadUserForToken(payload: TokenPayload): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { organization: true },
  });
  if (!user || user.deletedAt) throw new UnauthorizedError("User no longer exists");
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  };
}

// ---------------------------------------------------------------------------
// Registration & login
// ---------------------------------------------------------------------------

export async function register(input: {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  industryId?: string;
}) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existingUser) throw new ConflictError("An account with this email already exists");

  const industryId = input.industryId ?? null;
  const passwordHash = await bcrypt.hash(input.password, 10);

  const organization = await prisma.organization.create({
    data: {
      name: input.organizationName,
      slug: `${slugify(input.organizationName)}-${Date.now().toString(36)}`,
      industryId,
      settings: { aiPolicies: { allowKnowledgeRetrieval: true, provider: config.aiProvider } },
    },
  });

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: "ORG_ADMIN",
      organizationId: organization.id,
    },
  });

  await audit({
    organizationId: organization.id,
    userId: user.id,
    action: "ORGANIZATION_REGISTERED",
    entityType: "ORGANIZATION",
    entityId: organization.id,
  });

  return { user, organization };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.deletedAt) throw new UnauthorizedError("Invalid email or password");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await audit({
    organizationId: user.organizationId,
    userId: user.id,
    action: "USER_LOGIN",
  });

  const token = signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    },
  };
}
