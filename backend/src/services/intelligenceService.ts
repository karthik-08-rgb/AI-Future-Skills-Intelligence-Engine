import { prisma } from "../lib/prisma";
import type { Prisma } from "@prisma/client";
import { logger } from "../utils/logger";
import { round, average, compactJoin, clamp01 } from "../utils/math";
import { classifyImpact, type ImpactResult } from "../intelligence/impactClassifier";
import { scoreFutureSkill, type FutureSkillScoreResult } from "../intelligence/futureSkillScoring";
import { scoreReskilling, type ReskillingScoreResult } from "../intelligence/reskillingScoring";
import { calculateSkillGaps, type SkillGapResult } from "../intelligence/skillGap";
import type { ImpactType } from "../intelligence/classifications";
import { NotFoundError } from "../utils/errors";
import {
  buildFutureSkillRecommendation,
  buildReskillingRecommendation,
  buildDecliningSkillRecommendation,
  buildProcessRecommendation,
  type ReasoningNode,
} from "../intelligence/recommendationEngine";

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function loadOrgGraph(organizationId: string) {
  const [processes, roles, skills, futureSkills] = await Promise.all([
    prisma.process.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        activities: {
          where: { deletedAt: null },
          include: { skills: { include: { skill: true } }, roles: true },
        },
        processAiImpacts: true,
      },
    }),
    prisma.role.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        skills: { include: { skill: true } },
        futureSkills: { include: { futureSkill: true } },
        activities: { include: { activity: true } },
      },
    }),
    prisma.skill.findMany({
      where: { organizationId, deletedAt: null },
      include: { activities: true, roles: true },
    }),
    prisma.futureSkill.findMany({
      where: { organizationId, deletedAt: null },
      include: { roleFutureSkills: true, scores: { orderBy: { computedAt: "desc" }, take: 1 } },
    }),
  ]);

  return { processes, roles, skills, futureSkills };
}

// ---------------------------------------------------------------------------
// Impact computation
// ---------------------------------------------------------------------------

interface ComputedImpact {
  activityId: string;
  skillId: string;
  activityName: string;
  skillName: string;
  skillIsFuture: boolean;
  impact: ImpactResult;
}

function computeActivitySkillImpacts(
  processes: Awaited<ReturnType<typeof loadOrgGraph>>["processes"],
): ComputedImpact[] {
  const results: ComputedImpact[] = [];
  for (const process of processes) {
    for (const activity of process.activities) {
      for (const link of activity.skills) {
        const impact = classifyImpact(
          {
            automationPotential: activity.automationPotential,
            augmentationPotential: activity.augmentationPotential,
            humanDependency: activity.humanDependency,
          },
          {
            automationExposure: link.skill.automationExposure,
            augmentationExposure: link.skill.augmentationExposure,
            humanDependency: link.skill.humanDependency,
            isFuture: link.skill.isFuture,
          },
        );
        results.push({
          activityId: activity.id,
          skillId: link.skill.id,
          activityName: activity.name,
          skillName: link.skill.name,
          skillIsFuture: link.skill.isFuture,
          impact,
        });
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Public recompute pipeline (used by seed and admin action)
// ---------------------------------------------------------------------------

export async function recomputeOrganizationIntelligence(organizationId: string) {
  const started = Date.now();
  const graph = await loadOrgGraph(organizationId);

  const computed = computeActivitySkillImpacts(graph.processes);
  await persistActivitySkillImpacts(computed);
  await persistSkillImpacts(computed);
  await persistRoleSkillImpacts(computed, graph.roles);
  await persistProcessImpacts(graph.processes, computed);
  await persistFutureSkillScores(graph, computed);
  const reskilling = await computeReskilling(organizationId, graph);
  const recommendations = await generateRecommendations({
    organizationId,
    graph,
    computed,
    futureSkillScores: await loadFutureSkillScores(organizationId),
    reskilling,
  });
  await persistRecommendations(organizationId, recommendations);

  logger.info("intelligence.recomputed", {
    organizationId,
    impacts: computed.length,
    recommendations: recommendations.length,
    latencyMs: Date.now() - started,
  });
  return { impacts: computed.length, recommendations: recommendations.length };
}

async function persistActivitySkillImpacts(computed: ComputedImpact[]) {
  for (const row of computed) {
    const existing = await prisma.aiImpact.findFirst({
      where: { activityId: row.activityId, skillId: row.skillId, organizationId: null },
    });
    // Scope: activities belong to an organization; store organizationId on impact.
    const data = {
      impactType: row.impact.impactType,
      impactScore: row.impact.impactScore,
      automationPotential: row.impact.automationPotential,
      augmentationPotential: row.impact.augmentationPotential,
      humanDependency: row.impact.humanDependency,
      confidence: row.impact.confidence,
      reason: row.impact.reason,
      evidence: {
        activityName: row.activityName,
        skillName: row.skillName,
      },
    };
    if (existing) {
      await prisma.aiImpact.update({ where: { id: existing.id }, data });
    } else {
      await prisma.aiImpact.create({
        data: {
          ...data,
          activityId: row.activityId,
          skillId: row.skillId,
          organizationId: await resolveActivityOrg(row.activityId),
        },
      });
    }
  }
}

const activityOrgCache = new Map<string, Promise<string | null>>();
function resolveActivityOrg(activityId: string): Promise<string | null> {
  if (!activityOrgCache.has(activityId)) {
    activityOrgCache.set(
      activityId,
      prisma.activity.findUnique({ where: { id: activityId }, select: { organizationId: true } })
        .then((a) => a?.organizationId ?? null),
    );
  }
  return activityOrgCache.get(activityId)!;
}

async function persistSkillImpacts(computed: ComputedImpact[]) {
  const bySkill = new Map<string, ComputedImpact[]>();
  for (const row of computed) {
    if (row.skillIsFuture) continue;
    const list = bySkill.get(row.skillId) ?? [];
    list.push(row);
    bySkill.set(row.skillId, list);
  }

  for (const [skillId, rows] of bySkill) {
    const aggregate = aggregateImpacts(rows.map((r) => r.impact));
    if (!aggregate) continue;
    const orgId = rows[0].activityId ? await resolveActivityOrg(rows[0].activityId) : null;
    const existing = await prisma.aiImpact.findFirst({
      where: { skillId, activityId: null, roleId: null },
    });
    const data = {
      impactType: aggregate.impactType,
      impactScore: aggregate.impactScore,
      automationPotential: aggregate.automationPotential,
      augmentationPotential: aggregate.augmentationPotential,
      humanDependency: aggregate.humanDependency,
      confidence: aggregate.confidence,
      reason: aggregate.reason,
      evidence: {
        activityCount: rows.length,
        skills: rows.slice(0, 5).map((r) => ({ activity: r.activityName })),
      },
    };
    if (existing) {
      await prisma.aiImpact.update({ where: { id: existing.id }, data });
    } else {
      await prisma.aiImpact.create({ data: { ...data, skillId, organizationId: orgId } });
    }
  }
}

function aggregateImpacts(impacts: ImpactResult[]): ImpactResult | null {
  if (impacts.length === 0) return null;
  const counts = new Map<ImpactType, number>();
  for (const i of impacts) counts.set(i.impactType, (counts.get(i.impactType) ?? 0) + 1);
  let type: ImpactType = impacts[0].impactType;
  let max = -1;
  for (const [t, c] of counts) {
    if (c > max) {
      max = c;
      type = t;
    }
  }
  const dominant = [...impacts].sort((a, b) => b.impactScore - a.impactScore)[0];
  return {
    impactType: type,
    impactScore: round(average(impacts.map((i) => i.impactScore))),
    automationPotential: round(average(impacts.map((i) => i.automationPotential))),
    augmentationPotential: round(average(impacts.map((i) => i.augmentationPotential))),
    humanDependency: round(average(impacts.map((i) => i.humanDependency))),
    confidence: round(average(impacts.map((i) => i.confidence))),
    reason: dominant?.reason ?? "",
  };
}

async function persistRoleSkillImpacts(
  computed: ComputedImpact[],
  roles: Awaited<ReturnType<typeof loadOrgGraph>>["roles"],
) {
  // Map activity -> skill impacts for aggregation per role.
  const byActivitySkill = new Map<string, ComputedImpact>();
  for (const row of computed) {
    byActivitySkill.set(`${row.activityId}|${row.skillId}`, row);
  }

  for (const role of roles) {
    const roleActivityIds = new Set(role.activities.map((a) => a.activityId));
    // Group the role's activity-skill pairs by skill.
    const perSkill = new Map<string, ImpactResult[]>();
    for (const [key, row] of byActivitySkill) {
      const [activityId, skillId] = key.split("|");
      if (!roleActivityIds.has(activityId)) continue;
      if (row.skillIsFuture) continue;
      const list = perSkill.get(skillId) ?? [];
      list.push(row.impact);
      perSkill.set(skillId, list);
    }

    for (const [skillId, impacts] of perSkill) {
      const aggregate = aggregateImpacts(impacts);
      if (!aggregate) continue;
      const existing = await prisma.aiImpact.findFirst({
        where: { roleId: role.id, skillId, activityId: null },
      });
      const data = {
        impactType: aggregate.impactType,
        impactScore: aggregate.impactScore,
        automationPotential: aggregate.automationPotential,
        augmentationPotential: aggregate.augmentationPotential,
        humanDependency: aggregate.humanDependency,
        confidence: aggregate.confidence,
        reason: aggregate.reason,
        evidence: { activityCount: impacts.length },
      };
      if (existing) {
        await prisma.aiImpact.update({ where: { id: existing.id }, data });
      } else {
        await prisma.aiImpact.create({
          data: {
            ...data,
            roleId: role.id,
            skillId,
            organizationId: role.organizationId,
          },
        });
      }
    }
  }
}

async function persistProcessImpacts(
  processes: Awaited<ReturnType<typeof loadOrgGraph>>["processes"],
  computed: ComputedImpact[],
) {
  for (const process of processes) {
    const activityIds = new Set(process.activities.map((a) => a.id));
    const rows = computed.filter((r) => activityIds.has(r.activityId));
    if (rows.length === 0) continue;

    const automation = average(rows.map((r) => r.impact.automationPotential));
    const augmentation = average(rows.map((r) => r.impact.augmentationPotential));
    const highImpact = rows.filter(
      (r) => r.impact.automationPotential >= 0.5 || r.impact.augmentationPotential >= 0.6,
    ).length;
    const transformationScore = round(
      clamp01(automation * 0.6 + augmentation * 0.4) * 100,
    );

    const data = {
      automationPotential: round(automation),
      augmentationPotential: round(augmentation),
      transformationScore,
      affectedActivityCount: rows.length,
      highImpactActivityCount: highImpact,
    };
    const existing = await prisma.processAiImpact.findFirst({
      where: { processId: process.id },
    });
    if (existing) {
      await prisma.processAiImpact.update({ where: { id: existing.id }, data });
    } else {
      await prisma.processAiImpact.create({
        data: { ...data, processId: process.id, organizationId: process.organizationId },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Future skill scores
// ---------------------------------------------------------------------------

async function persistFutureSkillScores(
  graph: Awaited<ReturnType<typeof loadOrgGraph>>,
  computed: ComputedImpact[],
) {
  const roleCount = graph.roles.length || 1;
  const processCount = graph.processes.length || 1;
  const activityIdsByProcess = new Map<string, Set<string>>();
  for (const process of graph.processes) {
    activityIdsByProcess.set(process.id, new Set(process.activities.map((a) => a.id)));
  }
  // Map role -> activities
  const roleActivityIds = new Map<string, Set<string>>();
  for (const role of graph.roles) {
    roleActivityIds.set(role.id, new Set(role.activities.map((a) => a.activityId)));
  }
  // Map activity -> processId
  const activityProcess = new Map<string, string>();
  for (const process of graph.processes) {
    for (const activity of process.activities) {
      activityProcess.set(activity.id, process.id);
    }
  }

  for (const fs of graph.futureSkills) {
    const roleLinks = fs.roleFutureSkills.filter(
      (l) => !graph.roles.some((r) => r.id === l.roleId) === false,
    );
    const roleIds = fs.roleFutureSkills.map((l) => l.roleId);
    const rolesTouching = graph.roles.filter((r) => roleIds.includes(r.id));

    // Role relevance: share of roles requiring this skill, scaled by priority
    const priorityAvg = average(fs.roleFutureSkills.map((l) => l.priority)) || 0.5;
    const roleRelevance = round(
      (rolesTouching.length / roleCount) * 70 + priorityAvg * 30,
    );

    // Process impact: distinct processes touched by roles that need this skill
    const touchedProcesses = new Set<string>();
    for (const role of rolesTouching) {
      const acts = roleActivityIds.get(role.id) ?? new Set<string>();
      for (const actId of acts) {
        const procId = activityProcess.get(actId);
        if (procId) touchedProcesses.add(procId);
      }
    }
    const processImpact = round((touchedProcesses.size / processCount) * 100);

    // AI demand: seed signal blended with automation pressure of linked activities
    const linkedActivities: ComputedImpact[] = [];
    for (const role of rolesTouching) {
      const acts = roleActivityIds.get(role.id) ?? new Set<string>();
      linkedActivities.push(...computed.filter((c) => acts.has(c.activityId)));
    }
    const autoPressure = average(
      linkedActivities.map((c) => c.impact.automationPotential),
    );
    const augPressure = average(
      linkedActivities.map((c) => c.impact.augmentationPotential),
    );
    const aiDemand = round(
      clamp01(fs.demandSignal) * 60 + clamp01(autoPressure * 0.3 + augPressure * 0.4) * 40,
    );

    // Skill gap: average current gap across roles
    const gaps = fs.roleFutureSkills.map((l) => l.currentGap);
    const skillGap = round(average(gaps) * 100);

    // Industry relevance: from industry settings if present, else demand signal
    const industrySettings = await loadIndustryRelevance(fs.industryId);
    const industryRelevance = round(
      industrySettings?.futureSkillRelevance ?? clamp01(fs.demandSignal) * 85 + 10,
    );

    // Transformation impact: avg (auto+aug)/2 of linked activity impacts
    const transformationImpact = round(
      average(linkedActivities.map((c) => (c.impact.automationPotential + c.impact.augmentationPotential) / 2)) * 100,
    );

    const result: FutureSkillScoreResult = scoreFutureSkill({
      aiDemand,
      processImpact,
      roleRelevance,
      skillGap,
      industryRelevance,
      transformationImpact,
    });

    const existing = await prisma.futureSkillScore.findFirst({
      where: { futureSkillId: fs.id },
      orderBy: { computedAt: "desc" },
    });
    const data = {
      aiDemand: result.aiDemand,
      processImpact: result.processImpact,
      roleRelevance: result.roleRelevance,
      skillGap: result.skillGap,
      industryRelevance: result.industryRelevance,
      transformationImpact: result.transformationImpact,
      finalScore: result.finalScore,
      confidence: result.confidence,
    };
    if (existing) {
      await prisma.futureSkillScore.update({ where: { id: existing.id }, data });
    } else {
      await prisma.futureSkillScore.create({
        data: {
          ...data,
          futureSkillId: fs.id,
          organizationId: fs.organizationId,
        },
      });
    }
  }
}

const industryRelevanceCache = new Map<string, Promise<{ futureSkillRelevance?: number } | null>>();
function loadIndustryRelevance(industryId: string) {
  if (!industryRelevanceCache.has(industryId)) {
    industryRelevanceCache.set(
      industryId,
      prisma.industry
        .findUnique({ where: { id: industryId } })
        .then((i) => (i?.settings as { futureSkillRelevance?: number } | null) ?? null),
    );
  }
  return industryRelevanceCache.get(industryId)!;
}

async function loadFutureSkillScores(organizationId: string) {
  const scores = await prisma.futureSkillScore.findMany({
    where: { organizationId },
    include: { futureSkill: { include: { roleFutureSkills: true } } },
  });
  return scores;
}

// ---------------------------------------------------------------------------
// Reskilling
// ---------------------------------------------------------------------------

export async function computeReskilling(
  organizationId: string,
  graph?: Awaited<ReturnType<typeof loadOrgGraph>>,
) {
  const g = graph ?? (await loadOrgGraph(organizationId));
  const processActivities = g.processes.flatMap((p) => p.activities);

  const results = [];
  for (const role of g.roles) {
    const roleActivityIds = new Set(role.activities.map((a) => a.activityId));
    const roleActivities = processActivities.filter((a) => roleActivityIds.has(a.id));

    const affected = roleActivities.filter(
      (a) => a.automationPotential >= 0.5 || a.augmentationPotential >= 0.5,
    );
    const automationPressure = average(
      affected.map((a) => a.automationPotential),
    );
    const transformationImpact = average(
      roleActivities.map(
        (a) => clamp01((a.automationPotential + a.augmentationPotential) / 2),
      ),
    );
    const requiredFutureSkills = role.futureSkills.map((l) => ({
      name: l.futureSkill.name,
      id: l.futureSkillId,
      currentGap: l.currentGap,
    }));
    const skillGap = average(requiredFutureSkills.map((f) => f.currentGap));

    const scored = scoreReskilling({
      activityCount: roleActivities.length,
      affectedActivityCount: affected.length,
      automationPressure,
      skillGap,
      futureSkillCount: requiredFutureSkills.length,
      transformationImpact,
    });

    const missing = calculateSkillGaps(
      requiredFutureSkills.map((f) => ({ name: f.name, id: f.id })),
      role.skills.map((s) => s.skill.name),
    ).filter((m) => m.missing);

    results.push({
      role: {
        id: role.id,
        name: role.name,
        department: role.department,
      },
      score: scored.score,
      components: scored,
      affectedActivityCount: affected.length,
      activityCount: roleActivities.length,
      affectedActivities: affected.map((a) => ({
        id: a.id,
        name: a.name,
        processId: a.processId,
        processName: g.processes.find((p) => p.id === a.processId)?.name ?? "",
      })),
      requiredFutureSkills: requiredFutureSkills.map((f) => f.name),
      missingFutureSkills: missing.map((m) => m.futureSkillName),
      skillGap: scored.skillGap,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

interface RecommendationInputs {
  organizationId: string;
  graph: Awaited<ReturnType<typeof loadOrgGraph>>;
  computed: ComputedImpact[];
  futureSkillScores: Awaited<ReturnType<typeof loadFutureSkillScores>>;
  reskilling: Awaited<ReturnType<typeof computeReskilling>>;
}

interface GeneratedRecommendation {
  type: string;
  title: string;
  description: string;
  score: number;
  confidence: number;
  roleId?: string;
  futureSkillId?: string;
  chain: ReasoningNode[];
  evidence: Array<{
    entityType: string;
    entityId: string;
    label?: string;
    detail?: string;
    score?: number;
    sourceType: string;
  }>;
}

async function generateRecommendations(
  input: RecommendationInputs,
): Promise<GeneratedRecommendation[]> {
  const recommendations: GeneratedRecommendation[] = [];

  // 1. Future skill investments
  const sortedScores = input.futureSkillScores.sort(
    (a, b) => b.finalScore - a.finalScore,
  );
  const processByName = new Map(input.graph.processes.map((p) => [p.name, p]));

  for (const score of sortedScores.slice(0, 6)) {
    const fs = score.futureSkill;
    const roleLinks = input.graph.roles
      .map((role) => ({
        role,
        link: fs.roleFutureSkills.find((l) => l.roleId === role.id),
      }))
      .filter((x) => x.link)
      .sort((a, b) => (b.link!.priority ?? 0) - (a.link!.priority ?? 0));

    const topRole = roleLinks[0]?.role;
    const topRoleId = topRole?.id;
    const topRoleActivities = topRole
      ? new Set(
          input.graph.roles.find((r) => r.id === topRole.id)?.activities.map((a) => a.activityId) ??
            [],
        )
      : new Set<string>();

    // Find the highest-impact activity linked to this skill
    const linked = input.computed.filter((c) => topRoleActivities.has(c.activityId));
    const bestActivity = [...linked].sort(
      (a, b) => b.impact.impactScore - a.impact.impactScore,
    )[0];

    const processName = bestActivity
      ? input.graph.processes.find((p) =>
          p.activities.some((a) => a.id === bestActivity.activityId),
        )?.name
      : topRole
        ? input.graph.processes
            .filter((p) =>
              p.activities.some((a) =>
                (topRoleActivities.has(a.id)),
              ),
            )
            .map((p) => p.name)[0]
        : undefined;

    const components: Array<[string, number]> = (
      [
        ["AI demand", score.aiDemand],
        ["Process impact", score.processImpact],
        ["Role relevance", score.roleRelevance],
        ["Skill gap", score.skillGap],
        ["Industry relevance", score.industryRelevance],
        ["Transformation impact", score.transformationImpact],
      ] as Array<[string, number]>
    ).sort((a, b) => b[1] - a[1]);
    const dominant = components[0];

    recommendations.push(
      withEvidence(
        buildFutureSkillRecommendation({
          futureSkillId: fs.id,
          futureSkillName: fs.name,
          finalScore: score.finalScore,
          confidence: score.confidence,
          topRoleName: topRole?.name,
          topRoleId,
          processName,
          activityName: bestActivity?.activityName,
          activityId: bestActivity?.activityId,
          representativeSkillName: topRole?.skills[0]?.skill.name,
          dominantComponentLabel: dominant ? `${dominant[0]} (${Math.round(dominant[1])}/100)` : undefined,
        }),
        input.organizationId,
      ),
    );
  }

  // 2. Reskilling recommendations
  for (const res of input.reskilling.filter((r) => r.score >= 50).slice(0, 5)) {
    const role = input.graph.roles.find((r) => r.id === res.role.id);
    const processNames = Array.from(
      new Set(res.affectedActivities.map((a) => a.processName).filter(Boolean)),
    ).slice(0, 3);
    recommendations.push(
      withEvidence(
        buildReskillingRecommendation({
          roleId: res.role.id,
          roleName: res.role.name,
          score: res.score,
          confidence: 0.85,
          topSkills: res.requiredFutureSkills.slice(0, 3),
          affectedActivityCount: res.affectedActivityCount,
          skillGap: res.skillGap,
          processNames,
        }),
        input.organizationId,
      ),
    );
  }

  // 3. Declining skills
  const declining = await getDecliningSkills(input.organizationId);
  for (const skill of declining.slice(0, 4)) {
    recommendations.push(
      withEvidence(
        buildDecliningSkillRecommendation({
          skillName: skill.skillName,
          impactScore: skill.impactScore,
          roleNames: skill.roles.map((r) => r.name).slice(0, 3),
          transitionTo: skill.transitionTo,
          transitionReason: skill.transitionReason,
        }),
        input.organizationId,
      ),
    );
  }

  // 4. Process transformation
  const processImpacts = await prisma.processAiImpact.findMany({
    where: { organizationId: input.organizationId },
    include: { process: { include: { activities: { include: { roles: { include: { role: true } } } } } } },
  });
  for (const pi of processImpacts
    .filter((p) => p.transformationScore >= 60)
    .sort((a, b) => b.transformationScore - a.transformationScore)
    .slice(0, 3)) {
    const roles = Array.from(
      new Set(
        pi.process.activities.flatMap((a) => a.roles.map((r) => r.role.name)),
      ),
    );
    recommendations.push(
      withEvidence(
        buildProcessRecommendation({
          processName: pi.process.name,
          transformationScore: pi.transformationScore,
          highImpactActivities: pi.highImpactActivityCount,
          affectedRoles: roles,
        }),
        input.organizationId,
      ),
    );
  }

  return recommendations;
}

/** Attaches evidence rows derived from the reasoning chain to a recommendation. */
function withEvidence(
  rec: {
    type: string;
    title: string;
    description: string;
    score: number;
    confidence: number;
    roleId?: string;
    futureSkillId?: string;
    chain: ReasoningNode[];
  },
  _organizationId: string,
): GeneratedRecommendation {
  const entityTypeByLevel: Record<ReasoningNode["level"], string> = {
    process: "PROCESS",
    activity: "ACTIVITY",
    role: "ROLE",
    skill: "SKILL",
    current_skill: "SKILL",
    ai_impact: "AI_IMPACT",
    future_skill: "FUTURE_SKILL",
    score: "AI_IMPACT",
    evidence: "KNOWLEDGE_SOURCE",
  };
  const evidence = rec.chain
    .filter((n) => n.id || n.level === "ai_impact" || n.level === "score")
    .map((n) => ({
      entityType: entityTypeByLevel[n.level],
      entityId: n.id ?? n.label,
      label: n.label,
      detail: n.detail,
      score: n.score,
      sourceType: "intelligence",
    }));
  return { ...rec, evidence };
}

async function persistRecommendations(
  organizationId: string,
  recommendations: GeneratedRecommendation[],
) {
  await prisma.recommendation.deleteMany({ where: { organizationId } });
  for (const rec of recommendations) {
    const created = await prisma.recommendation.create({
      data: {
        organizationId,
        type: rec.type,
        title: rec.title,
        description: rec.description,
        score: rec.score,
        confidence: rec.confidence,
        roleId: rec.roleId,
        futureSkillId: rec.futureSkillId,
        reasoningChain: rec.chain as unknown as Prisma.InputJsonValue,
      },
    });
    for (const ev of rec.evidence) {
      await prisma.recommendationEvidence.create({
        data: {
          recommendationId: created.id,
          entityType: ev.entityType,
          entityId: ev.entityId,
          label: ev.label,
          detail: ev.detail,
          score: ev.score,
          sourceType: ev.sourceType,
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Queries used by the API
// ---------------------------------------------------------------------------

export async function getFutureSkills(organizationId: string, limit?: number) {
  const scores = await loadFutureSkillScores(organizationId);
  const roles = await prisma.role.findMany({
    where: { organizationId, deletedAt: null },
    include: { futureSkills: true },
  });
  const rows = scores
    .map((s) => {
      const roleIds = s.futureSkill.roleFutureSkills.map((l) => l.roleId);
      const linkedRoles = roles.filter((r) => roleIds.includes(r.id)).map((r) => r.name);
      return {
        futureSkillId: s.futureSkillId,
        name: s.futureSkill.name,
        description: s.futureSkill.description,
        category: s.futureSkill.category,
        finalScore: s.finalScore,
        confidence: s.confidence,
        components: {
          aiDemand: s.aiDemand,
          processImpact: s.processImpact,
          roleRelevance: s.roleRelevance,
          skillGap: s.skillGap,
          industryRelevance: s.industryRelevance,
          transformationImpact: s.transformationImpact,
        },
        roles: linkedRoles,
        computedAt: s.computedAt,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

export async function getDecliningSkills(organizationId: string) {
  const impacts = await prisma.aiImpact.findMany({
    where: {
      organizationId,
      impactType: "Declining",
      skillId: { not: null },
      activityId: null,
      roleId: null,
    },
    include: { skill: { include: { roles: { include: { role: true } } } } },
  });

  const rows = await Promise.all(
    impacts.map(async (impact) => {
      const skill = impact.skill!;
      // Transition target: future skills required by the roles that own this skill
      const roleIds = skill.roles.map((l) => l.roleId);
      const roleFuture = await prisma.roleFutureSkill.findMany({
        where: { roleId: { in: roleIds } },
        include: { futureSkill: true },
      });
      const transitions = Array.from(
        new Map(
          roleFuture.map((rf) => [rf.futureSkillId, rf.futureSkill.name]),
        ).values(),
      ).slice(0, 3);

      return {
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        impactType: impact.impactType,
        impactScore: impact.impactScore,
        automationPotential: impact.automationPotential,
        augmentationPotential: impact.augmentationPotential,
        humanDependency: impact.humanDependency,
        confidence: impact.confidence,
        reason: impact.reason ?? "",
        roles: skill.roles.map((l) => ({ id: l.role.id, name: l.role.name })),
        transitionTo: transitions[0],
        transitionReason:
          transitions.length > 0
            ? `Roles that rely on ${skill.name} are already mapped to future capabilities such as ${transitions.join(", ")}.`
            : undefined,
      };
    }),
  );

  return rows.sort((a, b) => b.impactScore - a.impactScore);
}

export async function getReskilling(organizationId: string) {
  return computeReskilling(organizationId);
}

export async function getRoleIntelligence(organizationId: string, roleId: string) {
  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId, deletedAt: null },
    include: {
      skills: { include: { skill: true } },
      futureSkills: { include: { futureSkill: true } },
      activities: { include: { activity: { include: { process: true } } } },
      recommendations: true,
    },
  });
  if (!role) throw new NotFoundError("Role not found");

  const currentSkills = role.skills.map((s) => ({
    id: s.skill.id,
    name: s.skill.name,
    category: s.skill.category,
    importance: s.importance,
    proficiency: s.proficiency,
  }));

  const requiredFuture = role.futureSkills.map((f) => ({
    id: f.futureSkillId,
    name: f.futureSkill.name,
    category: f.futureSkill.category,
    description: f.futureSkill.description,
    priority: f.priority,
    currentGap: f.currentGap,
  }));

  const skillGaps = calculateSkillGaps(
    requiredFuture.map((f) => ({ name: f.name, id: f.id })),
    currentSkills.map((s) => s.name),
  );

  const roleImpacts = await prisma.aiImpact.findMany({
    where: { roleId: role.id, activityId: null, skillId: { not: null } },
    include: { skill: true },
  });

  const affectedActivities = role.activities.map((link) => {
    const a = link.activity;
    const affected =
      a.automationPotential >= 0.5 || a.augmentationPotential >= 0.5;
    return {
      id: a.id,
      name: a.name,
      processId: a.processId,
      processName: a.process.name,
      automationPotential: a.automationPotential,
      augmentationPotential: a.augmentationPotential,
      affected,
    };
  });

  const reskilling = await computeReskilling(organizationId);
  const res = reskilling.find((r) => r.role.id === roleId);

  return {
    role: {
      id: role.id,
      name: role.name,
      description: role.description,
      department: role.department,
    },
    currentSkills,
    requiredFutureSkills: requiredFuture,
    skillGaps,
    missingFutureSkills: skillGaps.filter((g) => g.missing).map((g) => g.futureSkillName),
    skillImpacts: roleImpacts.map((i) => ({
      skillId: i.skillId!,
      skillName: i.skill?.name ?? "",
      impactType: i.impactType,
      impactScore: i.impactScore,
      reason: i.reason ?? "",
    })),
    affectedActivities,
    reskilling: res ?? null,
  };
}

export async function getProcessIntelligence(organizationId: string, processId: string) {
  const process = await prisma.process.findFirst({
    where: { id: processId, organizationId, deletedAt: null },
    include: {
      activities: {
        where: { deletedAt: null },
        include: {
          skills: { include: { skill: true } },
          roles: { include: { role: true } },
        },
      },
      processAiImpacts: true,
    },
  });
  if (!process) throw new NotFoundError("Process not found");

  const activities = process.activities.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    automationPotential: a.automationPotential,
    augmentationPotential: a.augmentationPotential,
    humanDependency: a.humanDependency,
    skills: a.skills.map((s) => ({
      id: s.skill.id,
      name: s.skill.name,
      relevance: s.relevance,
    })),
    roles: a.roles.map((r) => ({
      id: r.role.id,
      name: r.role.name,
      involvement: r.involvement,
    })),
  }));

  const affectedRoles = Array.from(
    new Set(
      process.activities.flatMap((a) => a.roles.map((r) => r.role.name)),
    ),
  );
  const affectedSkills = Array.from(
    new Set(process.activities.flatMap((a) => a.skills.map((s) => s.skill.name))),
  );
  const impact = process.processAiImpacts[0];

  return {
    process: {
      id: process.id,
      name: process.name,
      description: process.description,
      category: process.category,
    },
    activities,
    impact: impact ?? null,
    affectedRoles,
    affectedSkills,
  };
}

export async function getDashboard(organizationId: string) {
  const [
    roleCount,
    skillCount,
    futureSkills,
    declining,
    reskilling,
    processImpacts,
    impactDistribution,
    recommendations,
  ] = await Promise.all([
    prisma.role.count({ where: { organizationId, deletedAt: null } }),
    prisma.skill.count({ where: { organizationId, deletedAt: null } }),
    getFutureSkills(organizationId),
    getDecliningSkills(organizationId),
    getReskilling(organizationId),
    prisma.processAiImpact.findMany({
      where: { organizationId },
      include: { process: true },
    }),
    prisma.aiImpact.groupBy({
      by: ["impactType"],
      where: { organizationId, activityId: null, roleId: null },
      _count: { impactType: true },
    }),
    prisma.recommendation.findMany({
      where: { organizationId },
      orderBy: { score: "desc" },
      take: 8,
    }),
  ]);

  const impactDistributionMap: Record<string, number> = {};
  for (const row of impactDistribution) {
    impactDistributionMap[row.impactType] = row._count.impactType;
  }

  return {
    totals: {
      roles: roleCount,
      skills: skillCount,
      processes: processImpacts.length,
      recommendations: recommendations.length,
    },
    affectedRoles: reskilling.filter((r) => r.score >= 40).length,
    highReskillingRoles: reskilling.filter((r) => r.score >= 70).length,
    emergingSkills: futureSkills.filter((f) => f.finalScore >= 60).length,
    decliningSkills: declining.length,
    augmentedSkills: impactDistributionMap["AI-Augmented"] ?? 0,
    impactDistribution: impactDistributionMap,
    topFutureSkills: futureSkills.slice(0, 5),
    decliningSkillsList: declining.slice(0, 5),
    reskillingByRole: reskilling.slice(0, 5).map((r) => ({
      roleId: r.role.id,
      roleName: r.role.name,
      score: r.score,
    })),
    processTransformation: processImpacts
      .map((p) => ({
        processId: p.processId,
        processName: p.process.name,
        transformationScore: p.transformationScore,
        automationPotential: p.automationPotential,
        augmentationPotential: p.augmentationPotential,
        affectedActivityCount: p.affectedActivityCount,
      }))
      .sort((a, b) => b.transformationScore - a.transformationScore),
    topRecommendations: recommendations.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      score: r.score,
      confidence: r.confidence,
      reasoningChain: r.reasoningChain as ReasoningNode[] | null,
    })),
  };
}

export async function getRecommendationDetail(
  organizationId: string,
  recommendationId: string,
) {
  const recommendation = await prisma.recommendation.findFirst({
    where: { id: recommendationId, organizationId },
    include: { evidence: true, role: true, futureSkill: true },
  });
  if (!recommendation) throw new NotFoundError("Recommendation not found");
  return recommendation;
}

export { compactJoin };
