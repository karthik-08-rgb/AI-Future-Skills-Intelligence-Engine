import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { loadUserForToken, verifyToken, type AuthUser } from "../services/authService";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";
import { logger } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organizationId?: string;
      requestId?: string;
    }
  }
}

const SCOPED_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN", "ANALYST", "MEMBER", "VIEWER"]);

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing bearer token"));
  }
  try {
    const payload = verifyToken(header.slice(7));
    loadUserForToken(payload)
      .then((user) => {
        req.user = user;
        req.organizationId = user.organizationId ?? undefined;
        next();
      })
      .catch((err) => next(err));
  } catch (err) {
    next(err);
  }
}

export function requireOrg(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.organizationId) {
    return next(new ForbiddenError("This user is not associated with an organization"));
  }
  req.organizationId = req.user.organizationId;
  next();
}

const ROLE_PRIORITY: Record<string, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ANALYST: 3,
  ORG_ADMIN: 4,
  SUPER_ADMIN: 5,
};

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    const current = req.user.role;
    if (!SCOPED_ROLES.has(current)) return next(new ForbiddenError());
    const required = Math.max(...roles.map((r) => ROLE_PRIORITY[r] ?? 0));
    if ((ROLE_PRIORITY[current] ?? 0) < required) {
      return next(new ForbiddenError("Insufficient permissions for this action"));
    }
    next();
  };
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "SUPER_ADMIN") {
    return next(new ForbiddenError("Super admin access required"));
  }
  next();
}

/** Validates request body against a Zod schema. */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      logger.debug("validation.failed", { path: req.path, details });
      return next(
        Object.assign(new Error("Validation failed"), {
          status: 400,
          code: "VALIDATION_ERROR",
          details,
        }),
      );
    }
    req.body = result.data;
    next();
  };
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  req.requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const started = Date.now();
  res.on("finish", () => {
    logger.debug("http.request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      latencyMs: Date.now() - started,
      org: req.organizationId ?? null,
    });
  });
  next();
}
