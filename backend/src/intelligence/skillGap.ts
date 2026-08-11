import { normalizeName } from "../utils/math";

/**
 * Deterministic skill gap detection.
 *
 * A required (future) skill is "missing" from a role's current skills when no
 * current skill matches it. Matching uses normalized names plus a curated
 * synonym table, so minor naming differences don't create false gaps.
 */
const SYNONYMS: Record<string, string[]> = {
  "ai testing": ["automation testing", "test automation", "testing"],
  "ai assisted software development": ["coding", "software design", "testing"],
  "generative ai": ["ai", "machine learning"],
  "data engineering": ["sql", "python", "data visualization"],
  "mlops": ["ci/cd", "monitoring", "docker", "cloud computing"],
  "cloud ai": ["cloud computing"],
  "human ai collaboration": ["communication", "collaboration", "customer communication"],
  "critical thinking": ["problem solving", "analytical thinking", "troubleshooting"],
  "prompt engineering": ["communication"],
};

export interface SkillGapResult {
  futureSkillName: string;
  futureSkillId?: string;
  /** 0 = already present, 1 = completely missing */
  gap: number;
  matchedCurrentSkill?: string;
  missing: boolean;
}

export function findMatchingCurrentSkill(
  futureSkillName: string,
  currentSkillNames: string[],
): string | undefined {
  const normalizedTarget = normalizeName(futureSkillName);
  const currentNormalized = new Set(currentSkillNames.map((n) => normalizeName(n)));

  if (currentNormalized.has(normalizedTarget)) return futureSkillName;

  const synonyms = SYNONYMS[normalizedTarget] ?? [];
  for (const synonym of synonyms) {
    const normalized = normalizeName(synonym);
    if (currentNormalized.has(normalized)) {
      const original = currentSkillNames.find((n) => normalizeName(n) === normalized);
      return original;
    }
  }
  return undefined;
}

export function calculateSkillGaps(
  requiredSkills: { name: string; id?: string }[],
  currentSkillNames: string[],
): SkillGapResult[] {
  return requiredSkills.map((required) => {
    const match = findMatchingCurrentSkill(required.name, currentSkillNames);
    return {
      futureSkillName: required.name,
      futureSkillId: required.id,
      gap: match ? 0 : 1,
      matchedCurrentSkill: match,
      missing: !match,
    };
  });
}

/** Convenience: just the missing future skills for a role. */
export function missingSkills(
  requiredSkills: { name: string; id?: string }[],
  currentSkillNames: string[],
): SkillGapResult[] {
  return calculateSkillGaps(requiredSkills, currentSkillNames).filter((g) => g.missing);
}
