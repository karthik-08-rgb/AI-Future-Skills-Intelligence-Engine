import { clamp01, round, average } from "../utils/math";
import type { ImpactType } from "./classifications";

export interface SkillProfile {
  automationExposure: number;
  augmentationExposure: number;
  humanDependency: number;
  isFuture?: boolean;
}

export interface ActivityProfile {
  automationPotential: number;
  augmentationPotential: number;
  humanDependency: number;
}

export interface ImpactResult {
  impactType: ImpactType;
  impactScore: number; // 0-100
  automationPotential: number; // 0-1 effective
  augmentationPotential: number; // 0-1 effective
  humanDependency: number; // 0-1 blended
  confidence: number; // 0-1
  reason: string;
}

/**
 * Deterministic AI impact classification for an (activity, skill) pair.
 *
 * Effective automation/augmentation = activity potential x skill exposure,
 * because an automatable activity does not affect skills that are irrelevant
 * to it, and skill exposure measures how automatable/augmentable that skill
 * actually is.
 *
 * Classification rules:
 *   Emerging                        -> skill is a future capability
 *   automation >= 0.70 & human < 0.70   -> Declining
 *   automation >= 0.60 & human < 0.45   -> Declining
 *   automation >= 0.50 & human < 0.60   -> Changing
 *   augmentation >= 0.50 & human >= 0.50 -> AI-Augmented
 *   augmentation >= 0.45 | automation >= 0.40 -> Increasing
 *   otherwise                      -> Enduring Human Capability
 */
export function classifyImpact(
  activity: ActivityProfile,
  skill: SkillProfile,
): ImpactResult {
  const automation = clamp01(activity.automationPotential * skill.automationExposure);
  const augmentation = clamp01(activity.augmentationPotential * skill.augmentationExposure);
  const human = clamp01((activity.humanDependency + skill.humanDependency) / 2);
  const impactScore = round(clamp01((automation + augmentation) / 2) * 100);

  let impactType: ImpactType;
  if (skill.isFuture) {
    impactType = "Emerging";
  } else if ((automation >= 0.7 && human < 0.7) || (automation >= 0.6 && human < 0.45)) {
    impactType = "Declining";
  } else if (automation >= 0.5 && human < 0.6) {
    impactType = "Changing";
  } else if (augmentation >= 0.5 && human >= 0.5) {
    impactType = "AI-Augmented";
  } else if (augmentation >= 0.45 || automation >= 0.4) {
    impactType = "Increasing";
  } else {
    impactType = "Enduring Human Capability";
  }

  const reason = buildReason(impactType, { automation, augmentation, human }, skill);
  const inputsComplete =
    Number.isFinite(automation) && Number.isFinite(augmentation) && Number.isFinite(human);
  const confidence = round(clamp01(0.92 - (inputsComplete ? 0 : 0.4)));

  return {
    impactType,
    impactScore,
    automationPotential: round(automation),
    augmentationPotential: round(augmentation),
    humanDependency: round(human),
    confidence,
    reason,
  };
}

interface ReasonInputs {
  automation: number;
  augmentation: number;
  human: number;
}

function buildReason(
  type: ImpactType,
  inputs: ReasonInputs,
  skill: SkillProfile,
): string {
  const { automation, augmentation, human } = inputs;
  const pct = (v: number) => Math.round(v * 100);

  switch (type) {
    case "Emerging":
      return `AI-driven workflows are creating new demand for this capability (AI demand signal ${pct(
        skill.automationExposure,
      )}).`;
    case "Declining":
      return `High automation potential (${pct(automation)}%) with low-to-moderate human dependency (${pct(
        human,
      )}%) — AI can largely perform the underlying activity, so demand for this skill is expected to decline.`;
    case "Changing":
      return `Automation potential (${pct(
        automation,
      )}%) is significant while human dependency is moderate (${pct(
        human,
      )}%) — the nature and required proficiency of this skill is shifting toward AI-assisted work.`;
    case "AI-Augmented":
      return `AI significantly augments this skill (augmentation ${pct(
        augmentation,
      )}%) while human expertise remains essential (human dependency ${pct(human)}%).`;
    case "Increasing":
      return `AI adoption is increasing demand for this skill — augmentation pressure (${pct(
        augmentation,
      )}%) with sustainable human contribution (${pct(human)}%).`;
    case "Enduring Human Capability":
      return `Low automation potential (${pct(automation)}%) and high human dependency (${pct(
        human,
      )}%) — this remains a core human capability even under AI transformation.`;
  }
}

export interface SkillImpactSummary {
  skillId: string;
  skillName: string;
  impactType: ImpactType;
  impactScore: number;
  reason: string;
  evidence: unknown;
}

export function aggregateImpacts(impacts: ImpactResult[]): ImpactResult | null {
  if (impacts.length === 0) return null;
  return {
    impactType: majorityType(impacts),
    impactScore: round(average(impacts.map((i) => i.impactScore))),
    automationPotential: round(average(impacts.map((i) => i.automationPotential))),
    augmentationPotential: round(average(impacts.map((i) => i.augmentationPotential))),
    humanDependency: round(average(impacts.map((i) => i.humanDependency))),
    confidence: round(average(impacts.map((i) => i.confidence))),
    reason: aggregateReason(impacts),
  };
}

function majorityType(impacts: ImpactResult[]): ImpactType {
  const counts = new Map<ImpactType, number>();
  for (const impact of impacts) {
    counts.set(impact.impactType, (counts.get(impact.impactType) ?? 0) + 1);
  }
  let best: ImpactType = impacts[0].impactType;
  let bestCount = -1;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

function aggregateReason(impacts: ImpactResult[]): string {
  const dominant = [...impacts].sort((a, b) => b.impactScore - a.impactScore)[0];
  return dominant?.reason ?? "";
}
