import type { Request, Response } from "express";
import { asyncHandler } from "../middleware";
import {
  listIndustries,
  listProcesses,
  createProcess,
  updateProcess,
  deleteProcess,
  createActivity,
  listRoles,
  createRole,
  deleteRole,
  listSkills,
  createSkill,
  deleteSkill,
  listFutureSkills,
  getExplorer,
  getOrganization,
} from "../services/catalogService";
import { recomputeOrganizationIntelligence } from "../services/intelligenceService";
import { audit } from "../services/auditService";
import { CLASSIFICATION_LIST } from "../intelligence/classifications";

export const catalogController = {
  industries: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ industries: await listIndustries() });
  }),

  classifications: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ classifications: CLASSIFICATION_LIST });
  }),

  processes: asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.organizationId!;
    res.json({ processes: await listProcesses(orgId) });
  }),

  createProcess: asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.organizationId!;
    const process = await createProcess({ ...req.body, organizationId: orgId });
    await audit({
      organizationId: orgId,
      userId: req.user?.id,
      action: "PROCESS_CREATED",
      entityType: "PROCESS",
      entityId: process.id,
      details: { name: process.name },
    });
    res.status(201).json({ process });
  }),

  updateProcess: asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.organizationId!;
    res.json({ process: await updateProcess(orgId, req.params.id, req.body) });
  }),

  deleteProcess: asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.organizationId!;
    await deleteProcess(orgId, req.params.id);
    res.status(204).end();
  }),

  createActivity: asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.organizationId!;
    res.status(201).json({ activity: await createActivity({ ...req.body, organizationId: orgId }) });
  }),

  roles: asyncHandler(async (req: Request, res: Response) => {
    res.json({ roles: await listRoles(req.organizationId!) });
  }),

  createRole: asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.organizationId!;
    const role = await createRole({ ...req.body, organizationId: orgId });
    await audit({
      organizationId: orgId,
      userId: req.user?.id,
      action: "ROLE_CREATED",
      entityType: "ROLE",
      entityId: role.id,
      details: { name: role.name },
    });
    res.status(201).json({ role });
  }),

  deleteRole: asyncHandler(async (req: Request, res: Response) => {
    await deleteRole(req.organizationId!, req.params.id);
    res.status(204).end();
  }),

  skills: asyncHandler(async (req: Request, res: Response) => {
    const isFuture = req.query.isFuture === "true";
    res.json({ skills: await listSkills(req.organizationId!, { isFuture }) });
  }),

  createSkill: asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.organizationId!;
    const skill = await createSkill({ ...req.body, organizationId: orgId });
    await audit({
      organizationId: orgId,
      userId: req.user?.id,
      action: "SKILL_CREATED",
      entityType: "SKILL",
      entityId: skill.id,
      details: { name: skill.name },
    });
    res.status(201).json({ skill });
  }),

  deleteSkill: asyncHandler(async (req: Request, res: Response) => {
    await deleteSkill(req.organizationId!, req.params.id);
    res.status(204).end();
  }),

  futureSkills: asyncHandler(async (req: Request, res: Response) => {
    res.json({ futureSkills: await listFutureSkills(req.organizationId!) });
  }),

  explorer: asyncHandler(async (req: Request, res: Response) => {
    res.json({ processes: await getExplorer(req.organizationId!) });
  }),

  organization: asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.organizationId!;
    res.json({ organization: await getOrganization(orgId) });
  }),

  recompute: asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.organizationId!;
    const result = await recomputeOrganizationIntelligence(orgId);
    await audit({
      organizationId: orgId,
      userId: req.user?.id,
      action: "INTELLIGENCE_RECOMPUTED",
      details: result,
    });
    res.json({ ok: true, ...result });
  }),
};
