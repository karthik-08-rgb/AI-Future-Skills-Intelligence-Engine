import type { Request, Response } from "express";
import { z } from "zod";
import { register, login, signToken } from "../services/authService";
import { getOrganization, listMembers } from "../services/catalogService";
import { asyncHandler } from "../middleware";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
  industryId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const body = registerSchema.parse(req.body);
    const { user, organization } = await register(body);
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      organization: { id: organization.id, name: organization.name },
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const body = loginSchema.parse(req.body);
    const result = await login(body.email, body.password);
    res.json(result);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new Error("unauthenticated");
    res.json({
      user: req.user,
      organization: req.user.organizationId
        ? await getOrganization(req.user.organizationId)
        : null,
    });
  }),

  organization: asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.organizationId;
    if (!orgId) throw new Error("no org");
    const [org, members] = await Promise.all([getOrganization(orgId), listMembers(orgId)]);
    res.json({ organization: org, members });
  }),
};
