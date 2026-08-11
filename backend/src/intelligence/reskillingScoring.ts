import { clamp01, round, average } from "../utils/math";
import { RESKILLING_WEIGHTS } from "./classifications";

export interface ReskillingInputs {
  /** Total activities the role participates in. */
  activityCount: number;
  /** Activities with meaningful AI exposure (automation or augmentation >= 0.5). */
  affectedActivityCount: number;
  /** Average automation potential across affected activities (0-1). */
  automationPressure: number;
  /** Average current gap across required future skills (0-1). */
  skillGap: number;
  /** Number of future skills the role is required to learn. */
  futureSkillCount: number;
  /** Average transformation (automation+augmentation) across all role activities (0-1). */
  transformationImpact: number;
}

export interface ReskillingScoreResult {
  score: number; // 0-100
  affectedRatio: number; // 0-1
  automationPressure: number;
  skillGap: number;
  futureSkillLoad: number; // 0-1 normalized
  transformationImpact: number;
}

/**
 * Deterministic Role Reskilling Score (0-100).
 *
 * Signals: proportion of AI-affected activities, automation pressure,
 * current skill gap toward future skills, number of required future skills
 * (load), and overall transformation impact. Higher = greater reskilling need.
 */
export function scoreReskilling(inputs: ReskillingInputs): ReskillingScoreResult {
  const affectedRatio =
    inputs.activityCount > 0
      ? clamp01(inputs.affectedActivityCount / inputs.activityCount)
      : 0;

  const futureSkillLoad = clamp01(inputs.futureSkillCount / 3); // 3+ future skills = full load

  const score = round(
    clamp01(
      RESKILLING_WEIGHTS.affectedActivities * affectedRatio +
        RESKILLING_WEIGHTS.automationPressure * clamp01(inputs.automationPressure) +
        RESKILLING_WEIGHTS.skillGap * clamp01(inputs.skillGap) +
        RESKILLING_WEIGHTS.futureSkillLoad * futureSkillLoad +
        RESKILLING_WEIGHTS.transformationImpact * clamp01(inputs.transformationImpact),
    ) * 100,
  );

  return {
    score,
    affectedRatio: round(affectedRatio),
    automationPressure: round(clamp01(inputs.automationPressure)),
    skillGap: round(clamp01(inputs.skillGap)),
    futureSkillLoad: round(futureSkillLoad),
    transformationImpact: round(clamp01(inputs.transformationImpact)),
  };
}

/** Average of the signal values, for transparency. */
export function reskillingSignals(
  inputs: ReskillingInputs,
): ReskillingScoreResult {
  return scoreReskilling(inputs);
}

export { average };
