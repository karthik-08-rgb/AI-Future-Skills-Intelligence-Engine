import { Router } from "express";
import multer from "multer";
import { authController } from "../controllers/authController";
import { catalogController } from "../controllers/catalogController";
import { intelligenceController } from "../controllers/intelligenceController";
import { assistantController } from "../controllers/assistantController";
import { knowledgeController } from "../controllers/knowledgeController";
import { importController } from "../controllers/importController";
import { recommendationController } from "../controllers/recommendationController";
import { adminController } from "../controllers/adminController";
import {
  requireAuth,
  requireOrg,
  requireRole,
  validateBody,
} from "../middleware";
import { config } from "../config";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxDocumentSizeBytes },
});

const router = Router();

// ---------------------------------------------------------------------------
// Health & meta (public)
// ---------------------------------------------------------------------------
router.get("/health", adminController.health);
router.get("/meta/system", adminController.system);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.get("/auth/me", requireAuth, authController.me);
router.get("/auth/organization", requireAuth, requireOrg, authController.organization);

// ---------------------------------------------------------------------------
// Meta (authenticated)
// ---------------------------------------------------------------------------
router.get("/meta/industries", requireAuth, catalogController.industries);
router.get("/meta/classifications", requireAuth, adminController.classifications);

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------
router.get("/organizations", requireAuth, requireOrg, catalogController.organization);

// ---------------------------------------------------------------------------
// Catalog CRUD (tenant-scoped)
// ---------------------------------------------------------------------------
router.get("/processes", requireAuth, requireOrg, catalogController.processes);
router.post(
  "/processes",
  requireAuth,
  requireOrg,
  requireRole("MEMBER"),
  validateBody(
    z.object({
      industryId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
    }),
  ),
  catalogController.createProcess,
);
router.patch("/processes/:id", requireAuth, requireOrg, requireRole("MEMBER"), catalogController.updateProcess);
router.delete("/processes/:id", requireAuth, requireOrg, requireRole("ANALYST"), catalogController.deleteProcess);

router.post(
  "/activities",
  requireAuth,
  requireOrg,
  requireRole("MEMBER"),
  validateBody(
    z.object({
      processId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      automationPotential: z.number().min(0).max(1).default(0.5),
      augmentationPotential: z.number().min(0).max(1).default(0.5),
      humanDependency: z.number().min(0).max(1).default(0.5),
    }),
  ),
  catalogController.createActivity,
);

router.get("/roles", requireAuth, requireOrg, catalogController.roles);
router.post(
  "/roles",
  requireAuth,
  requireOrg,
  requireRole("MEMBER"),
  validateBody(
    z.object({
      industryId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      department: z.string().optional(),
    }),
  ),
  catalogController.createRole,
);
router.delete("/roles/:id", requireAuth, requireOrg, requireRole("ANALYST"), catalogController.deleteRole);

router.get("/skills", requireAuth, requireOrg, catalogController.skills);
router.post(
  "/skills",
  requireAuth,
  requireOrg,
  requireRole("MEMBER"),
  validateBody(
    z.object({
      industryId: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      isFuture: z.boolean().optional(),
    }),
  ),
  catalogController.createSkill,
);
router.delete("/skills/:id", requireAuth, requireOrg, requireRole("ANALYST"), catalogController.deleteSkill);

router.get("/future-skills", requireAuth, requireOrg, catalogController.futureSkills);

// ---------------------------------------------------------------------------
// Intelligence
// ---------------------------------------------------------------------------
router.get("/intelligence/dashboard", requireAuth, requireOrg, intelligenceController.dashboard);
router.get("/intelligence/future-skills", requireAuth, requireOrg, intelligenceController.futureSkills);
router.get("/intelligence/declining-skills", requireAuth, requireOrg, intelligenceController.decliningSkills);
router.get("/intelligence/reskilling", requireAuth, requireOrg, intelligenceController.reskilling);
router.get("/intelligence/role/:id", requireAuth, requireOrg, intelligenceController.role);
router.get("/intelligence/process/:id", requireAuth, requireOrg, intelligenceController.process);
router.post("/intelligence/recompute", requireAuth, requireOrg, requireRole("ANALYST"), catalogController.recompute);

router.get("/explorer", requireAuth, requireOrg, catalogController.explorer);

// ---------------------------------------------------------------------------
// AI Assistant
// ---------------------------------------------------------------------------
router.post(
  "/assistant/query",
  requireAuth,
  requireOrg,
  validateBody(
    z.object({
      question: z.string().min(2),
      useKnowledge: z.boolean().optional(),
    }),
  ),
  assistantController.query,
);
router.get("/assistant/interactions", requireAuth, requireOrg, assistantController.interactions);
router.post(
  "/assistant/feedback",
  requireAuth,
  requireOrg,
  validateBody(
    z.object({
      interactionId: z.string(),
      rating: z.enum(["HELPFUL", "NOT_HELPFUL"]),
      reason: z.string().optional(),
    }),
  ),
  assistantController.feedback,
);

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------
router.get("/recommendations", requireAuth, requireOrg, recommendationController.list);
router.get("/recommendations/:id", requireAuth, requireOrg, recommendationController.detail);
router.patch(
  "/recommendations/:id/status",
  requireAuth,
  requireOrg,
  requireRole("MEMBER"),
  validateBody(z.object({ status: z.string() })),
  recommendationController.status,
);

// ---------------------------------------------------------------------------
// Knowledge / RAG
// ---------------------------------------------------------------------------
router.get("/knowledge", requireAuth, requireOrg, knowledgeController.list);
router.post(
  "/knowledge",
  requireAuth,
  requireOrg,
  requireRole("MEMBER"),
  knowledgeController.create,
);
router.post(
  "/knowledge/upload",
  requireAuth,
  requireOrg,
  requireRole("MEMBER"),
  upload.single("file"),
  knowledgeController.upload,
);
router.delete("/knowledge/:id", requireAuth, requireOrg, requireRole("ANALYST"), knowledgeController.delete);

// ---------------------------------------------------------------------------
// Data import
// ---------------------------------------------------------------------------
router.get("/data/imports", requireAuth, requireOrg, importController.list);
router.post(
  "/data/import/upload",
  requireAuth,
  requireOrg,
  requireRole("MEMBER"),
  upload.single("file"),
  importController.upload,
);
router.post(
  "/data/import",
  requireAuth,
  requireOrg,
  requireRole("MEMBER"),
  importController.import,
);

// ---------------------------------------------------------------------------
// Admin / observability
// ---------------------------------------------------------------------------
router.get("/admin/metrics", requireAuth, adminController.metrics);
router.get("/admin/logs", requireAuth, adminController.logs);
router.get("/admin/feedback", requireAuth, adminController.feedback);

export default router;
