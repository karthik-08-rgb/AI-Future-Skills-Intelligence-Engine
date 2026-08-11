import { prisma } from "../lib/prisma";
import type { Prisma } from "@prisma/client";
import { logger } from "../utils/logger";
import { getAIProvider, isLLMConfigured } from "../ai/providerRegistry";
import { retrieveChunks } from "./knowledgeService";
import {
  getFutureSkills,
  getDecliningSkills,
  getReskilling,
  getDashboard,
  getRoleIntelligence,
  getProcessIntelligence,
} from "./intelligenceService";
import { normalizeName } from "../utils/math";
import type { ReasoningNode } from "../intelligence/recommendationEngine";

// ---------------------------------------------------------------------------
// Intent detection (deterministic)
// ---------------------------------------------------------------------------

export type AssistantIntent =
  | "top_future_skills"
  | "declining_skills"
  | "reskilling"
  | "role_intelligence"
  | "process_intelligence"
  | "impact_distribution"
  | "dashboard_summary"
  | "general";

const INTENT_RULES: Array<{ intent: AssistantIntent; patterns: string[] }> = [
  {
    intent: "top_future_skills",
    patterns: [
      "future skill",
      "top skill",
      "top future",
      "emerging skill",
      "should we invest",
      "most important skill",
      "which skills will we need",
      "skills will we need",
      "what skills should we develop",
      "future-proof",
    ],
  },
  {
    intent: "declining_skills",
    patterns: [
      "declin",
      "automation",
      "disappear",
      "redundant",
      "going away",
      "less important",
      "obsolete",
      "replaced by ai",
      "skills decreasing",
    ],
  },
  {
    intent: "reskilling",
    patterns: [
      "reskill",
      "retrain",
      "upskill",
      "which role",
      "training need",
      "greatest reskilling",
      "need to learn",
      "skill gap",
    ],
  },
  {
    intent: "process_intelligence",
    patterns: ["process", "transformation potential", "which process", "automate first"],
  },
  {
    intent: "role_intelligence",
    patterns: ["role", "job", "position", "engineer", "analyst", "specialist"],
  },
  {
    intent: "impact_distribution",
    patterns: [
      "impact",
      "classification",
      "augmented",
      "enduring",
      "changing",
      "increasing",
      "how is ai affecting",
    ],
  },
  {
    intent: "dashboard_summary",
    patterns: ["overview", "summary", "dashboard", "what do we know", "how is our organization", "state of"],
  },
];

export function detectIntent(question: string): AssistantIntent {
  const normalized = question.toLowerCase();
  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (normalized.includes(pattern)) return rule.intent;
    }
  }
  return "general";
}

// ---------------------------------------------------------------------------
// Structured query execution (deterministic intelligence)
// ---------------------------------------------------------------------------

interface StructuredPayload {
  intent: AssistantIntent;
  data: Record<string, unknown>;
  suggestions: Array<{ label: string; detail?: string }>;
  uncertainty: string | null;
}

interface AssistantResult extends StructuredPayload {
  answer: string;
  evidence: Array<{ title: string; content: string; score: number; sourceType: string; trustLevel: number }>;
  provider: string;
  model?: string;
  degraded: boolean;
}

async function executeStructuredQuery(
  intent: AssistantIntent,
  organizationId: string,
  question: string,
): Promise<StructuredPayload> {
  switch (intent) {
    case "top_future_skills": {
      const futureSkills = await getFutureSkills(organizationId, 8);
      return {
        intent,
        data: { futureSkills },
        suggestions: futureSkills.slice(0, 4).map((s) => ({
          label: `Invest in ${s.name} (score ${s.finalScore}/100)`,
          detail: `Top driver: ${dominantLabel(s.components)}. Relevant roles: ${s.roles.slice(0, 3).join(", ") || "none"}.`,
        })),
        uncertainty: futureSkills.length === 0 ? "No future skills have been defined for this organization yet." : null,
      };
    }
    case "declining_skills": {
      const declining = await getDecliningSkills(organizationId);
      return {
        intent,
        data: { decliningSkills: declining.slice(0, 10) },
        suggestions: declining.slice(0, 4).map((s) => ({
          label: `Plan transition from ${s.skillName}`,
          detail: s.transitionTo
            ? `Suggested next capability: ${s.transitionTo}.`
            : "No transition target mapped yet.",
        })),
        uncertainty: declining.length === 0 ? "No skills are currently classified as declining." : null,
      };
    }
    case "reskilling": {
      const reskilling = await getReskilling(organizationId);
      return {
        intent,
        data: { reskilling: reskilling.slice(0, 10) },
        suggestions: reskilling.slice(0, 4).map((r) => ({
          label: `Reskill ${r.role.name} (score ${r.score}/100)`,
          detail: `Missing future skills: ${r.missingFutureSkills.slice(0, 3).join(", ") || "none"}${r.affectedActivityCount ? ` · ${r.affectedActivityCount} affected activities` : ""}.`,
        })),
        uncertainty: reskilling.length === 0 ? "No role data available to compute reskilling needs." : null,
      };
    }
    case "role_intelligence": {
      const roles = await prisma.role.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, name: true },
      });
      const target = pickNamedTarget(roles, question);
      const role = target ? await getRoleIntelligence(organizationId, target.id) : null;
      if (!role) {
        return {
          intent,
          data: { roles: roles.map((r) => r.name) },
          suggestions: [],
          uncertainty: `Could not identify a specific role from your question. Available roles: ${roles.map((r) => r.name).join(", ")}.`,
        };
      }
      return {
        intent,
        data: { role },
        suggestions: (role.missingFutureSkills ?? []).slice(0, 3).map((s) => ({
          label: `Add ${s} to ${role.role.name}'s learning plan`,
          detail: role.reskilling
            ? `Reskilling score ${role.reskilling.score}/100.`
            : undefined,
        })),
        uncertainty: null,
      };
    }
    case "process_intelligence": {
      const processes = await prisma.process.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, name: true },
      });
      const target = pickNamedTarget(processes, question);
      const process = target ? await getProcessIntelligence(organizationId, target.id) : null;
      if (!process) {
        const processImpacts = await prisma.processAiImpact.findMany({
          where: { organizationId },
          include: { process: true },
          orderBy: { transformationScore: "desc" },
        });
        return {
          intent,
          data: { processImpacts },
          suggestions: processImpacts.slice(0, 4).map((p) => ({
            label: `Prioritize ${p.process.name} (transformation ${p.transformationScore}/100)`,
            detail: `${p.affectedActivityCount} activities, automation ${Math.round(p.automationPotential * 100)}%.`,
          })),
          uncertainty: processImpacts.length === 0 ? "No process impact data available." : null,
        };
      }
      return {
        intent,
        data: { process },
        suggestions: (process.impact?.transformationScore ?? 0) >= 60
          ? [{ label: `Automate & augment ${process.process.name} first`, detail: `Transformation score ${process.impact?.transformationScore}/100.` }]
          : [],
        uncertainty: null,
      };
    }
    case "impact_distribution": {
      const dashboard = await getDashboard(organizationId);
      return {
        intent,
        data: {
          impactDistribution: dashboard.impactDistribution,
          totals: dashboard.totals,
        },
        suggestions: [],
        uncertainty: null,
      };
    }
    case "dashboard_summary":
    default: {
      const dashboard = await getDashboard(organizationId);
      return {
        intent: "dashboard_summary",
        data: dashboard,
        suggestions: dashboard.topFutureSkills.slice(0, 3).map((s) => ({
          label: `Top future skill: ${s.name} (${s.finalScore}/100)`,
        })),
        uncertainty: dashboard.totals.roles === 0 ? "The organization has no role data yet." : null,
      };
    }
  }
}

function dominantLabel(components: Record<string, number>): string {
  const entries = Object.entries(components).sort((a, b) => b[1] - a[1]);
  return entries.length > 0 ? `${entries[0][0]}` : "balanced";
}

function pickNamedTarget<T extends { id: string; name: string }>(
  names: T[],
  question: string,
): T | null {
  const normalizedQuestion = normalizeName(question);
  let best: T | null = null;
  let bestScore = 0;
  for (const item of names) {
    const name = normalizeName(item.name);
    if (normalizedQuestion.includes(name)) {
      // Prefer longer matches (more specific names)
      if (name.length > bestScore) {
        best = item;
        bestScore = name.length;
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Explanation
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the executive assistant for an AI Future Skills Intelligence platform.

Rules:
- Answer ONLY from the supplied structured intelligence and retrieved knowledge. Never invent records, scores, statistics, or sources.
- Distinguish calculated results (scores derived from the organization's data model) from external knowledge (retrieved documents). Say "based on retrieved knowledge" when citing a document.
- When the provided data is insufficient, state explicitly: "Insufficient evidence to determine ..." and do not guess.
- Be concise and executive-friendly. Max ~160 words.
- If retrieved evidence is empty, do not claim any external sources.
- Respond with strict JSON: {"answer": "string", "uncertainty": string|null}.
`;

function buildPrompt(
  question: string,
  structured: StructuredPayload,
  evidence: Array<{ title: string; content: string; score: number; sourceType: string; trustLevel: number }>,
): string {
  const contextJson = JSON.stringify(
    {
      intent: structured.intent,
      question,
      data: structured.data,
      suggestions: structured.suggestions,
      uncertainty: structured.uncertainty,
    },
    null,
    2,
  );
  const evidenceBlock = evidence.length
    ? evidence
        .map((e, i) => `[${i + 1}] (${e.sourceType}, trust ${e.trustLevel}) ${e.title}\n${e.content.slice(0, 600)}`)
        .join("\n\n")
    : "(no retrieved knowledge)";
  return [
    `Structured intelligence context:\n\`\`\`json\n${contextJson}\n\`\`\``,
    `Retrieved knowledge:\n${evidenceBlock}`,
    `Executive question: ${question}`,
  ].join("\n\n");
}

export async function answerQuestion(input: {
  organizationId: string;
  userId?: string | null;
  question: string;
  useKnowledge?: boolean;
}): Promise<AssistantResult & { interactionId: string }> {
  const started = Date.now();
  const intent = detectIntent(input.question);
  const structured = await executeStructuredQuery(intent, input.organizationId, input.question);

  let evidence: AssistantResult["evidence"] = [];
  let retrievalMode: "semantic" | "keyword" | "none" = "none";
  if (input.useKnowledge !== false) {
    try {
      const retrieved = await retrieveChunks({
        organizationId: input.organizationId,
        query: input.question,
        k: 4,
      });
      evidence = retrieved.chunks.map((c) => ({
        title: c.sourceTitle,
        content: c.content,
        score: c.score,
        sourceType: c.sourceType,
        trustLevel: c.trustLevel,
      }));
      retrievalMode = retrieved.mode;
    } catch (err) {
      logger.warn("assistant.retrieval_failed", {
        message: err instanceof Error ? err.message : "retrieval error",
      });
      retrievalMode = "none";
    }
  }

  const provider = getAIProvider();
  const prompt = buildPrompt(input.question, structured, evidence);
  let answer: string;
  let providerUsed = provider.id;
  let model: string | undefined;
  let degraded = false;

  if (provider.id === "openai") {
    try {
      const result = await provider.generateText({
        system: SYSTEM_PROMPT,
        prompt,
        temperature: 0.3,
        maxTokens: 500,
      });
      model = result.model;
      const parsed = safeParseAnswer(result.text);
      answer = parsed?.answer ?? result.text;
      if (parsed?.uncertainty) {
        structured.uncertainty = structured.uncertainty ?? parsed.uncertainty;
      }
    } catch (err) {
      logger.warn("assistant.llm_failed_degraded", {
        message: err instanceof Error ? err.message : "llm error",
      });
      degraded = true;
      answer = await fallbackTemplateAnswer(intent, input.question, structured);
    }
  } else {
    providerUsed = "template";
    answer = await fallbackTemplateAnswer(intent, input.question, structured);
  }

  const interaction = await prisma.aiInteraction.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      question: input.question,
      intent,
      structuredContext: {
        data: structured.data,
        suggestions: structured.suggestions,
      } as Prisma.InputJsonValue,
      response: {
        answer,
        data: structured.data,
        suggestions: structured.suggestions,
        provider: providerUsed,
        retrievalMode,
      } as Prisma.InputJsonValue,
      provider: providerUsed,
      model,
      sources: evidence.map((e) => ({ title: e.title, score: e.score })) as Prisma.InputJsonValue,
      latencyMs: Date.now() - started,
      status: degraded ? "DEGRADED" : "COMPLETED",
    },
  });

  logger.info("assistant.answered", {
    organizationId: input.organizationId,
    intent,
    provider: providerUsed,
    degraded,
    latencyMs: Date.now() - started,
  });

  return {
    answer,
    intent,
    data: structured.data,
    evidence,
    suggestions: structured.suggestions,
    provider: providerUsed,
    model,
    uncertainty: structured.uncertainty,
    degraded,
    interactionId: interaction.id,
  };
}

function safeParseAnswer(text: string): { answer?: string; uncertainty?: string | null } | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function fallbackTemplateAnswer(
  intent: AssistantIntent,
  question: string,
  structured: StructuredPayload,
): Promise<string> {
  const title = {
    top_future_skills: "Top future skills for your organization",
    declining_skills: "Skills declining due to automation",
    reskilling: "Roles requiring the greatest reskilling",
    role_intelligence: "Role intelligence",
    process_intelligence: "Process intelligence",
    impact_distribution: "AI impact distribution",
    dashboard_summary: "Organization intelligence overview",
    general: "AI skills intelligence summary",
  }[intent];

  const parts = [`${title}.`];
  parts.push("(Deterministic template explanation — no LLM was invoked.)");
  if (structured.uncertainty) parts.push(`Note: ${structured.uncertainty}`);

  if (structured.suggestions.length > 0) {
    parts.push("Key findings:");
    for (const s of structured.suggestions.slice(0, 5)) {
      parts.push(`- ${s.label}${s.detail ? ` (${s.detail})` : ""}`);
    }
  } else {
    const itemCounts = Object.keys(structured.data).map(
      (key) => `${key}: ${Array.isArray(structured.data[key]) ? (structured.data[key] as unknown[]).length : "n/a"}`,
    );
    if (itemCounts.length) parts.push(`Data available: ${itemCounts.join(", ")}.`);
  }

  parts.push(
    "All figures are calculated from your organization's Process → Activity → Role → Skill → AI Impact → Future Skill model. No external statistics are claimed.",
  );
  return parts.join("\n");
}

export { isLLMConfigured };
export type { ReasoningNode };
