/**
 * The six AI impact classifications.
 *
 * Single source of truth for classification metadata. Definitions are surfaced
 * through GET /api/meta/classifications so the UI and docs never duplicate them.
 */

export const IMPACT_TYPES = [
  "Emerging",
  "Increasing",
  "AI-Augmented",
  "Changing",
  "Declining",
  "Enduring Human Capability",
] as const;

export type ImpactType = (typeof IMPACT_TYPES)[number];

export interface ClassificationDefinition {
  type: ImpactType;
  label: string;
  definition: string;
  color: string; // tailwind-friendly hex for charts
}

export const CLASSIFICATIONS: Record<ImpactType, ClassificationDefinition> = {
  Emerging: {
    type: "Emerging",
    label: "Emerging",
    definition:
      "A capability becoming important because of new AI-driven workflows or technologies.",
    color: "#22c55e",
  },
  Increasing: {
    type: "Increasing",
    label: "Increasing",
    definition:
      "A capability whose demand is expected to increase as organizations adopt AI and digital transformation.",
    color: "#3b82f6",
  },
  "AI-Augmented": {
    type: "AI-Augmented",
    label: "AI-Augmented",
    definition:
      "A capability where AI significantly assists the worker but human expertise remains necessary.",
    color: "#8b5cf6",
  },
  Changing: {
    type: "Changing",
    label: "Changing",
    definition:
      "A capability whose nature or required proficiency is changing due to AI transformation.",
    color: "#f59e0b",
  },
  Declining: {
    type: "Declining",
    label: "Declining",
    definition:
      "A capability associated with activities increasingly automated or reduced by AI.",
    color: "#ef4444",
  },
  "Enduring Human Capability": {
    type: "Enduring Human Capability",
    label: "Enduring Human Capability",
    definition:
      "A human capability expected to remain important despite AI adoption.",
    color: "#14b8a6",
  },
};

export const CLASSIFICATION_LIST: ClassificationDefinition[] =
  IMPACT_TYPES.map((t) => CLASSIFICATIONS[t]);

export function isImpactType(value: string): value is ImpactType {
  return (IMPACT_TYPES as readonly string[]).includes(value);
}

/** Weights used for the Future Skill Score aggregation. */
export const FUTURE_SKILL_WEIGHTS = {
  aiDemand: 0.25,
  processImpact: 0.2,
  roleRelevance: 0.2,
  skillGap: 0.15,
  industryRelevance: 0.1,
  transformationImpact: 0.1,
} as const;

/** Weights used for the Role Reskilling Score aggregation. */
export const RESKILLING_WEIGHTS = {
  affectedActivities: 0.25,
  automationPressure: 0.2,
  skillGap: 0.25,
  futureSkillLoad: 0.15,
  transformationImpact: 0.15,
} as const;
