import { clamp01, round, average } from "../utils/math";
import { FUTURE_SKILL_WEIGHTS } from "./classifications";

export interface FutureSkillComponents {
  aiDemand: number; // 0-100
  processImpact: number; // 0-100
  roleRelevance: number; // 0-100
  skillGap: number; // 0-100
  industryRelevance: number; // 0-100
  transformationImpact: number; // 0-100
}

export interface FutureSkillScoreResult extends FutureSkillComponents {
  finalScore: number; // 0-100
  confidence: number;
}

/**
 * Deterministic Future Skill Score.
 *
 *   Future Skill Score = aiDemand + processImpact + roleRelevance +
 *                        skillGap + industryRelevance + transformationImpact
 *
 * Weighted (see FUTURE_SKILL_WEIGHTS) and normalized to 0-100.
 * Component scores are returned so the scoring is transparent and explainable.
 */
export function scoreFutureSkill(
  components: FutureSkillComponents,
): FutureSkillScoreResult {
  const finalScore = round(
    FUTURE_SKILL_WEIGHTS.aiDemand * components.aiDemand +
      FUTURE_SKILL_WEIGHTS.processImpact * components.processImpact +
      FUTURE_SKILL_WEIGHTS.roleRelevance * components.roleRelevance +
      FUTURE_SKILL_WEIGHTS.skillGap * components.skillGap +
      FUTURE_SKILL_WEIGHTS.industryRelevance * components.industryRelevance +
      FUTURE_SKILL_WEIGHTS.transformationImpact * components.transformationImpact,
  );

  const confidence = round(
    clamp01(
      average([
        components.aiDemand / 100,
        components.processImpact / 100,
        components.roleRelevance / 100,
        components.skillGap / 100,
        components.industryRelevance / 100,
        components.transformationImpact / 100,
      ]) * 0.9 +
        0.08,
    ),
  );

  return {
    ...components,
    finalScore,
    confidence,
  };
}

/** Common helper used by scoring and explanation: describe the driver of a score. */
export function dominantComponent(result: FutureSkillScoreResult): {
  key: keyof FutureSkillScoreResult;
  value: number;
} {
  const keys: (keyof FutureSkillScoreResult)[] = [
    "aiDemand",
    "processImpact",
    "roleRelevance",
    "skillGap",
    "industryRelevance",
    "transformationImpact",
  ];
  let best = keys[0];
  let bestValue = -1;
  for (const key of keys) {
    const v = result[key] as number;
    if (v > bestValue) {
      best = key;
      bestValue = v;
    }
  }
  return { key: best, value: bestValue };
}
