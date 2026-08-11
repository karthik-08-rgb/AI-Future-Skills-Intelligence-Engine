import type { Request, Response } from "express";
import { asyncHandler } from "../middleware";
import { z } from "zod";
import {
  listKnowledgeSources,
  deleteKnowledgeSource,
  ingestText,
  parseFileContent,
} from "../services/knowledgeService";
import { audit } from "../services/auditService";
import { config } from "../config";
import { PayloadTooLargeError } from "../utils/errors";

const createSchema = z.object({
  title: z.string().min(1),
  sourceType: z.enum(["csv", "json", "text", "markdown", "pdf", "url"]).default("text"),
  documentType: z.string().default("report"),
  content: z.string().min(1),
  trustLevel: z.number().min(0).max(1).optional(),
  industryId: z.string().optional(),
});

export const knowledgeController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    res.json({ sources: await listKnowledgeSources(req.organizationId ?? null) });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const body = createSchema.parse(req.body);
    const result = await ingestText({
      organizationId: req.organizationId ?? null,
      industryId: body.industryId,
      title: body.title,
      source: "manual-entry",
      sourceType: body.sourceType,
      documentType: body.documentType,
      trustLevel: body.trustLevel,
      text: body.content,
    });
    await audit({
      organizationId: req.organizationId,
      userId: req.user?.id,
      action: "KNOWLEDGE_CREATED",
      entityType: "KNOWLEDGE_SOURCE",
      entityId: result.source.id,
      details: { title: body.title },
    });
    res.status(201).json(result);
  }),

  upload: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No file uploaded" } });
    }
    if (file.size > config.maxDocumentSizeBytes) {
      throw new PayloadTooLargeError("File exceeds the maximum allowed size");
    }
    const sourceType = (req.body.sourceType as string) ?? file.mimetype ?? "text";
    const documentType = (req.body.documentType as string) ?? "report";
    const content = await parseFileContent(file.buffer, file.originalname, sourceType);
    const result = await ingestText({
      organizationId: req.organizationId ?? null,
      industryId: req.body.industryId,
      title: req.body.title ?? file.originalname,
      source: file.originalname,
      sourceType,
      documentType,
      text: content,
      trustLevel: req.body.trustLevel ? Number(req.body.trustLevel) : undefined,
    });
    await audit({
      organizationId: req.organizationId,
      userId: req.user?.id,
      action: "KNOWLEDGE_UPLOADED",
      entityType: "KNOWLEDGE_SOURCE",
      entityId: result.source.id,
      details: { filename: file.originalname, chunks: result.chunkCount },
    });
    res.status(201).json(result);
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await deleteKnowledgeSource(req.organizationId ?? null, req.params.id);
    res.status(204).end();
  }),
};
