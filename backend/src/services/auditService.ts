import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";

export async function audit(input: {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: unknown;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        details: (input.details as object | undefined) ?? undefined,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit logging must never break the request flow.
    logger.warn("audit.write_failed", {
      message: err instanceof Error ? err.message : "audit error",
    });
  }
}

export async function listAuditLogs(organizationId: string | null, limit = 100) {
  return prisma.auditLog.findMany({
    where: organizationId ? { organizationId } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
