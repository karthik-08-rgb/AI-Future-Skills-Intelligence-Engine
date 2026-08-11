import type { Request, Response } from "express";
import { asyncHandler } from "../middleware";
import { z } from "zod";
import { answerQuestion } from "../services/assistantService";
import { prisma } from "../lib/prisma";

const querySchema = z.object({
  question: z.string().min(2, "Question must be at least 2 characters"),
  useKnowledge: z.boolean().optional(),
});

const feedbackSchema = z.object({
  interactionId: z.string(),
  rating: z.enum(["HELPFUL", "NOT_HELPFUL"]),
  reason: z.string().optional(),
});

export const assistantController = {
  query: asyncHandler(async (req: Request, res: Response) => {
    const body = querySchema.parse(req.body);
    const result = await answerQuestion({
      organizationId: req.organizationId!,
      userId: req.user?.id ?? null,
      question: body.question,
      useKnowledge: body.useKnowledge,
    });
    res.json(result);
  }),

  interactions: asyncHandler(async (req: Request, res: Response) => {
    const interactions = await prisma.aiInteraction.findMany({
      where: { organizationId: req.organizationId! },
      include: { feedback: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ interactions });
  }),

  feedback: asyncHandler(async (req: Request, res: Response) => {
    const body = feedbackSchema.parse(req.body);
    const { createFeedback } = await import("../services/feedbackService");
    const feedback = await createFeedback({
      interactionId: body.interactionId,
      userId: req.user?.id ?? null,
      rating: body.rating,
      reason: body.reason,
    });
    res.status(201).json({ feedback });
  }),
};
