import type { Request, Response } from "express";
import { asyncHandler } from "../middleware";
import { z } from "zod";
import { importRows, listImports, validateAndPreview } from "../services/importService";
import { getOrganization, listIndustries } from "../services/catalogService";
import { audit } from "../services/auditService";
import { config } from "../config";
import { PayloadTooLargeError } from "../utils/errors";

const importSchema = z.object({
  entityType: z
    .enum(["role-skills", "skills", "roles", "activities"])
    .default("role-skills"),
  filename: z.string().optional(),
  content: z.any(),
});

const uploadSchema = z.object({
  entityType: z.enum(["role-skills", "skills", "roles", "activities"]).default("role-skills"),
});

export const importController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    res.json({ imports: await listImports(req.organizationId!) });
  }),

  /** Single-step JSON import: validate + commit. */
  import: asyncHandler(async (req: Request, res: Response) => {
    const body = importSchema.parse(req.body);
    const content = typeof req.body.content === "string" ? req.body.content : JSON.stringify(req.body.content);
    const org = await getOrganization(req.organizationId!);
    const industryId =
      org.industryId ?? (await listIndustries())[0]?.id;
    if (!industryId) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Organization has no industry assigned" },
      });
    }
    const result = await importRows({
      organizationId: req.organizationId!,
      industryId,
      filename: body.filename ?? "payload.json",
      entityType: body.entityType,
      content,
      createdById: req.user?.id ?? null,
    });
    await audit({
      organizationId: req.organizationId,
      userId: req.user?.id,
      action: "DATA_IMPORTED",
      entityType: "DATA_IMPORT",
      entityId: result.id,
      details: { entityType: body.entityType, summary: result.summary },
    });
    res.status(201).json(result);
  }),

  /** Validate + preview an uploaded file (CSV/JSON). */
  upload: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No file uploaded" } });
    }
    if (file.size > config.maxDocumentSizeBytes) {
      throw new PayloadTooLargeError("File exceeds the maximum allowed size");
    }
    const body = uploadSchema.parse(req.body ?? {});
    const content = file.buffer.toString("utf8");
    const preview = validateAndPreview(file.originalname, content, body.entityType);
    res.json({
      filename: file.originalname,
      entityType: body.entityType,
      ...preview,
    });
  }),
};
