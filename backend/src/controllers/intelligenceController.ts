import type { Request, Response } from "express";
import { asyncHandler } from "../middleware";
import {
  getDashboard,
  getFutureSkills,
  getDecliningSkills,
  getReskilling,
  getRoleIntelligence,
  getProcessIntelligence,
} from "../services/intelligenceService";

export const intelligenceController = {
  dashboard: asyncHandler(async (req: Request, res: Response) => {
    res.json(await getDashboard(req.organizationId!));
  }),

  futureSkills: asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json({ futureSkills: await getFutureSkills(req.organizationId!, limit) });
  }),

  decliningSkills: asyncHandler(async (req: Request, res: Response) => {
    res.json({ decliningSkills: await getDecliningSkills(req.organizationId!) });
  }),

  reskilling: asyncHandler(async (req: Request, res: Response) => {
    res.json({ reskilling: await getReskilling(req.organizationId!) });
  }),

  role: asyncHandler(async (req: Request, res: Response) => {
    res.json(await getRoleIntelligence(req.organizationId!, req.params.id));
  }),

  process: asyncHandler(async (req: Request, res: Response) => {
    res.json(await getProcessIntelligence(req.organizationId!, req.params.id));
  }),
};
