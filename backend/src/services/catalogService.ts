import { prisma } from "../lib/prisma";
import { NotFoundError, ConflictError } from "../utils/errors";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Industries (global catalog)
// ---------------------------------------------------------------------------

export async function listIndustries() {
  return prisma.industry.findMany({ orderBy: { name: "asc" } });
}

export async function getIndustry(id: string) {
  const industry = await prisma.industry.findUnique({ where: { id } });
  if (!industry) throw new NotFoundError("Industry not found");
  return industry;
}

// ---------------------------------------------------------------------------
// Processes
// ---------------------------------------------------------------------------

export async function listProcesses(organizationId: string) {
  return prisma.process.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      processAiImpacts: true,
      _count: { select: { activities: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createProcess(data: {
  organizationId: string;
  industryId: string;
  name: string;
  description?: string;
  category?: string;
}) {
  const existing = await prisma.process.findFirst({
    where: {
      organizationId: data.organizationId,
      name: data.name,
      deletedAt: null,
    },
  });
  if (existing) throw new ConflictError(`Process "${data.name}" already exists`);
  return prisma.process.create({ data });
}

export async function updateProcess(
  organizationId: string,
  id: string,
  data: Partial<{ name: string; description: string; category: string }>,
) {
  const existing = await prisma.process.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!existing) throw new NotFoundError("Process not found");
  return prisma.process.update({ where: { id }, data });
}

export async function deleteProcess(organizationId: string, id: string) {
  const existing = await prisma.process.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!existing) throw new NotFoundError("Process not found");
  return prisma.process.update({ where: { id }, data: { deletedAt: new Date() } });
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export async function createActivity(data: {
  organizationId: string;
  processId: string;
  name: string;
  description?: string;
  automationPotential: number;
  augmentationPotential: number;
  humanDependency: number;
}) {
  const process = await prisma.process.findFirst({
    where: { id: data.processId, organizationId: data.organizationId },
  });
  if (!process) throw new NotFoundError("Process not found");
  return prisma.activity.create({ data });
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export async function listRoles(organizationId: string) {
  return prisma.role.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      _count: {
        select: { skills: true, futureSkills: true, activities: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createRole(data: {
  organizationId: string;
  industryId: string;
  name: string;
  description?: string;
  department?: string;
}) {
  const existing = await prisma.role.findFirst({
    where: { organizationId: data.organizationId, name: data.name, deletedAt: null },
  });
  if (existing) throw new ConflictError(`Role "${data.name}" already exists`);
  return prisma.role.create({ data });
}

export async function deleteRole(organizationId: string, id: string) {
  const existing = await prisma.role.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!existing) throw new NotFoundError("Role not found");
  return prisma.role.update({ where: { id }, data: { deletedAt: new Date() } });
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export async function listSkills(organizationId: string, opts?: { isFuture?: boolean }) {
  const where: Prisma.SkillWhereInput = {
    organizationId,
    deletedAt: null,
  };
  if (opts?.isFuture !== undefined) where.isFuture = opts.isFuture;
  return prisma.skill.findMany({ where, orderBy: { name: "asc" } });
}

export async function createSkill(data: {
  organizationId: string;
  industryId: string;
  name: string;
  description?: string;
  category?: string;
  isFuture?: boolean;
}) {
  const existing = await prisma.skill.findFirst({
    where: { organizationId: data.organizationId, name: data.name, deletedAt: null },
  });
  if (existing) throw new ConflictError(`Skill "${data.name}" already exists`);
  return prisma.skill.create({
    data: {
      organizationId: data.organizationId,
      industryId: data.industryId,
      name: data.name,
      description: data.description,
      category: data.category ?? "Technical",
      isFuture: data.isFuture ?? false,
    },
  });
}

export async function deleteSkill(organizationId: string, id: string) {
  const existing = await prisma.skill.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!existing) throw new NotFoundError("Skill not found");
  return prisma.skill.update({ where: { id }, data: { deletedAt: new Date() } });
}

// ---------------------------------------------------------------------------
// Future skills
// ---------------------------------------------------------------------------

export async function listFutureSkills(organizationId: string) {
  return prisma.futureSkill.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Explorer path: Industry -> Process -> Activity -> Role -> Skill -> Impact
// ---------------------------------------------------------------------------

export async function getExplorer(organizationId: string) {
  const processes = await prisma.process.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      processAiImpacts: true,
      activities: {
        where: { deletedAt: null },
        include: {
          roles: { include: { role: true } },
          skills: {
            include: {
              skill: {
                include: {
                  aiImpacts: { where: { activityId: null, roleId: null } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return processes;
}

// ---------------------------------------------------------------------------
// Organizations & members
// ---------------------------------------------------------------------------

export async function getOrganization(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { industry: true },
  });
  if (!org) throw new NotFoundError("Organization not found");
  return org;
}

export async function listMembers(organizationId: string) {
  return prisma.user.findMany({
    where: { organizationId, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}
