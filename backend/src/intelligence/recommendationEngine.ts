import { round } from "../utils/math";

/** A single node in a recommendation's reasoning chain. */
export interface ReasoningNode {
  level:
    | "process"
    | "activity"
    | "role"
    | "skill"
    | "current_skill"
    | "ai_impact"
    | "future_skill"
    | "score"
    | "evidence";
  id?: string;
  label: string;
  detail?: string;
  score?: number;
  type?: string;
}

export interface RecommendationInput {
  type: string; // FUTURE_SKILL | RESKILLING | DECLINING_SKILL | PROCESS
  title: string;
  description: string;
  score: number;
  confidence: number;
  roleId?: string;
  futureSkillId?: string;
  chain: ReasoningNode[];
}

export function buildFutureSkillRecommendation(input: {
  futureSkillId: string;
  futureSkillName: string;
  finalScore: number;
  confidence: number;
  topRoleName?: string;
  topRoleId?: string;
  processName?: string;
  activityName?: string;
  activityId?: string;
  representativeSkillName?: string;
  dominantComponentLabel?: string;
  description?: string;
}): RecommendationInput {
  const chain: ReasoningNode[] = [];
  if (input.processName) {
    chain.push({
      level: "process",
      label: input.processName,
      detail: "Process where this skill becomes critical",
    });
  }
  if (input.activityName) {
    chain.push({
      level: "activity",
      id: input.activityId,
      label: input.activityName,
      detail: "Activity driving AI demand for this capability",
    });
  }
  if (input.topRoleName) {
    chain.push({
      level: "role",
      id: input.topRoleId,
      label: input.topRoleName,
      detail: "Role with highest relevance for this skill",
    });
  }
  if (input.representativeSkillName) {
    chain.push({
      level: "current_skill",
      label: input.representativeSkillName,
      detail: "Related current capability being transformed",
    });
  }
  chain.push({
    level: "ai_impact",
    label: "AI-Augmented / Emerging demand",
    detail: "AI transformation increases the value of this capability",
  });
  chain.push({
    level: "future_skill",
    id: input.futureSkillId,
    label: input.futureSkillName,
    type: "Future skill",
  });
  chain.push({
    level: "score",
    label: `Future Skill Score ${round(input.finalScore)}/100`,
    detail: input.dominantComponentLabel
      ? `Top driver: ${input.dominantComponentLabel}`
      : undefined,
    score: input.finalScore,
  });

  const description =
    input.description ??
    `${input.futureSkillName} ranks ${round(
      input.finalScore,
    )}/100 on the future skill index. Invest in training, tooling and hiring to close the gap${
      input.topRoleName ? `, starting with ${input.topRoleName}` : ""
    }.`;

  return {
    type: "FUTURE_SKILL",
    title: `Invest in ${input.futureSkillName}`,
    description,
    score: input.finalScore,
    confidence: input.confidence,
    roleId: input.topRoleId,
    futureSkillId: input.futureSkillId,
    chain,
  };
}

export function buildReskillingRecommendation(input: {
  roleId: string;
  roleName: string;
  score: number;
  confidence: number;
  topSkills: string[];
  affectedActivityCount: number;
  skillGap: number;
  processNames: string[];
}): RecommendationInput {
  const chain: ReasoningNode[] = [
    {
      level: "role",
      id: input.roleId,
      label: input.roleName,
      detail: "Role under AI-driven transformation",
    },
    {
      level: "ai_impact",
      label: `${input.affectedActivityCount} affected activities`,
      detail: "Activities with automation or augmentation potential >= 0.5",
    },
    {
      level: "score",
      label: `Reskilling Score ${round(input.score)}/100`,
      detail: `Average future-skill gap ${Math.round(input.skillGap * 100)}%`,
      score: input.score,
    },
    ...input.processNames.map<ReasoningNode>((name) => ({
      level: "process",
      label: name,
      detail: "Affected process",
    })),
    {
      level: "future_skill",
      label: input.topSkills.join(", "),
      detail: "Highest-priority future skills for this role",
    },
  ];

  return {
    type: "RESKILLING",
    title: `Reskill ${input.roleName}`,
    description: `${input.roleName} has a reskilling need of ${round(
      input.score,
    )}/100. Prioritize ${input.topSkills.join(", ")} to keep the role effective as AI transforms ${input.processNames.slice(0, 3).join(", ")}.`,
    score: input.score,
    confidence: input.confidence,
    roleId: input.roleId,
    chain,
  };
}

export function buildDecliningSkillRecommendation(input: {
  skillName: string;
  impactScore: number;
  roleNames: string[];
  transitionTo?: string;
  transitionReason?: string;
}): RecommendationInput {
  const chain: ReasoningNode[] = [
    {
      level: "current_skill",
      label: input.skillName,
      detail: "Current capability under automation pressure",
    },
    {
      level: "ai_impact",
      label: `Declining · impact ${round(input.impactScore)}/100`,
      detail:
        "High automation potential with low human dependency on underlying activities",
      score: input.impactScore,
    },
    ...input.roleNames.map<ReasoningNode>((role) => ({
      level: "role",
      label: role,
      detail: "Role currently relying on this skill",
    })),
    {
      level: "future_skill",
      label: input.transitionTo ?? "AI-native replacement capability",
      detail: input.transitionReason ?? "Suggested transition path",
    },
  ];

  return {
    type: "DECLINING_SKILL",
    title: `Transition from ${input.skillName}`,
    description: `${input.skillName} is declining (impact ${round(
      input.impactScore,
    )}/100). Plan a transition${
      input.transitionTo ? ` toward ${input.transitionTo}` : ""
    } for affected roles${
      input.roleNames.length ? ` (${input.roleNames.join(", ")})` : ""
    }.`,
    score: round(input.impactScore),
    confidence: 0.8,
    chain,
  };
}

export function buildProcessRecommendation(input: {
  processName: string;
  transformationScore: number;
  highImpactActivities: number;
  affectedRoles: string[];
}): RecommendationInput {
  const chain: ReasoningNode[] = [
    {
      level: "process",
      label: input.processName,
      detail: "Process with high AI transformation potential",
    },
    {
      level: "score",
      label: `Transformation Score ${round(input.transformationScore)}/100`,
      detail: `${input.highImpactActivities} high-impact activities`,
      score: input.transformationScore,
    },
    ...input.affectedRoles.map<ReasoningNode>((role) => ({
      level: "role",
      label: role,
      detail: "Affected role",
    })),
    {
      level: "ai_impact",
      label: "Automation & augmentation potential",
      detail: "Composite of activity-level AI exposure",
    },
  ];

  return {
    type: "PROCESS",
    title: `Prioritize AI transformation of ${input.processName}`,
    description: `${input.processName} shows strong AI transformation potential (${round(
      input.transformationScore,
    )}/100) across ${input.highImpactActivities} activities. Focus automation and augmentation investments here first.`,
    score: round(input.transformationScore),
    confidence: 0.85,
    chain,
  };
}
