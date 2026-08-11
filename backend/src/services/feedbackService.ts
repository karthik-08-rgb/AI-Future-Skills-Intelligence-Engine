import { prisma } from "../lib/prisma";
import { NotFoundError } from "../utils/errors";

export async function createFeedback(input: {
  interactionId: string;
  userId?: string | null;
  rating: "HELPFUL" | "NOT_HELPFUL";
  reason?: string;
}) {
  const interaction = await prisma.aiInteraction.findUnique({
    where: { id: input.interactionId },
  });
  if (!interaction) throw new NotFoundError("AI interaction not found");
  return prisma.feedback.create({
    data: {
      interactionId: input.interactionId,
      userId: input.userId ?? null,
      rating: input.rating,
      reason: input.reason,
    },
  });
}

export async function listFeedback(organizationId: string | null) {
  return prisma.feedback.findMany({
    where: organizationId
      ? { interaction: { organizationId } }
      : {},
    include: { interaction: { select: { question: true, intent: true, provider: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function feedbackStats(organizationId: string | null) {
  const where = organizationId ? { interaction: { organizationId } } : {};
  const [helpful, notHelpful] = await Promise.all([
    prisma.feedback.count({ where: { ...where, rating: "HELPFUL" } }),
    prisma.feedback.count({ where: { ...where, rating: "NOT_HELPFUL" } }),
  ]);
  return { helpful, notHelpful, total: helpful + notHelpful };
}
