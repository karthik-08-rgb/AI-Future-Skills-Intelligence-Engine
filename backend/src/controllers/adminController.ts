import type { Request, Response } from "express";
import { asyncHandler } from "../middleware";
import { prisma } from "../lib/prisma";
import { listAuditLogs } from "../services/auditService";
import { listFeedback, feedbackStats } from "../services/feedbackService";
import { isLLMConfigured } from "../ai/providerRegistry";
import { config } from "../config";
import { logger } from "../utils/logger";

interface MetricSample {
  count: number;
  lastLatencyMs: number;
  lastAt: string;
}

// Simple in-memory metrics (single-instance). Documented as a minimal MVP
// observability surface; production would use a metrics service.
const requestMetrics = new Map<string, MetricSample>();
export function recordMetric(name: string, latencyMs: number) {
  const sample = requestMetrics.get(name);
  if (sample) {
    requestMetrics.set(name, {
      count: sample.count + 1,
      lastLatencyMs: latencyMs,
      lastAt: new Date().toISOString(),
    });
  } else {
    requestMetrics.set(name, {
      count: 1,
      lastLatencyMs: latencyMs,
      lastAt: new Date().toISOString(),
    });
  }
}

export const adminController = {
  health: asyncHandler(async (_req: Request, res: Response) => {
    let dbOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? "ok" : "degraded",
      db: dbOk ? "connected" : "unavailable",
      ai: { provider: config.aiProvider, configured: isLLMConfigured() },
      timestamp: new Date().toISOString(),
    });
  }),

  metrics: asyncHandler(async (req: Request, res: Response) => {
    if (req.user?.role !== "SUPER_ADMIN" && req.user?.role !== "ORG_ADMIN") {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required" } });
    }
    const metrics = Object.fromEntries(requestMetrics);
    res.json({
      metrics,
      counts: {
        organizations: await prisma.organization.count(),
        users: await prisma.user.count(),
        interactions: await prisma.aiInteraction.count(),
        recommendations: await prisma.recommendation.count(),
        knowledgeChunks: await prisma.documentChunk.count(),
      },
    });
  }),

  logs: asyncHandler(async (req: Request, res: Response) => {
    if (req.user?.role !== "SUPER_ADMIN" && req.user?.role !== "ORG_ADMIN") {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required" } });
    }
    res.json({ logs: await listAuditLogs(req.organizationId ?? null) });
  }),

  feedback: asyncHandler(async (req: Request, res: Response) => {
    if (req.user?.role !== "SUPER_ADMIN" && req.user?.role !== "ORG_ADMIN") {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required" } });
    }
    const [feedback, stats] = await Promise.all([
      listFeedback(req.organizationId ?? null),
      feedbackStats(req.organizationId ?? null),
    ]);
    res.json({ feedback, stats });
  }),

  classifications: asyncHandler(async (_req: Request, res: Response) => {
    const { CLASSIFICATION_LIST } = await import("../intelligence/classifications");
    res.json({ classifications: CLASSIFICATION_LIST });
  }),

  system: asyncHandler(async (_req: Request, res: Response) => {
    logger.debug("system.info.requested");
    res.json({
      provider: config.aiProvider,
      llmConfigured: isLLMConfigured(),
      env: config.env,
    });
  }),
};
