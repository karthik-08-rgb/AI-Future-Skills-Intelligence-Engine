import type { Request, Response } from "express";
import { asyncHandler } from "../middleware";
import { prisma } from "../lib/prisma";
import {
  getRecommendationDetail,
} from "../services/intelligenceService";
import { audit } from "../services/auditService";

export const recommendationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const type = req.query.type as string | undefined;
    const recommendations = await prisma.recommendation.findMany({
      where: { organizationId: req.organizationId!, ...(type ? { type } : {}) },
      include: {
        role: { select: { id: true, name: true } },
        futureSkill: { select: { id: true, name: true } },
        _count: { select: { evidence: true } },
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    res.json({ recommendations });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    res.json(await getRecommendationDetail(req.organizationId!, req.params.id));
  }),

  status: asyncHandler(async (req: Request, res: Response) => {
    const status = (req.body.status as string) ?? "ACKNOWLEDGED";
    const updated = await prisma.recommendation.updateMany({
      where: { id: req.params.id, organizationId: req.organizationId! },
      data: { status },
    });
    if (updated.count === 0) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Recommendation not found" } });
    }
    await audit({
      organizationId: req.organizationId,
      userId: req.user?.id,
      action: "RECOMMENDATION_STATUS",
      entityType: "RECOMMENDATION",
      entityId: req.params.id,
      details: { status },
    });
    res.json({ ok: true, status });
  }),
};
