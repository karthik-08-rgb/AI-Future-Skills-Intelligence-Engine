import { config } from "../config";
import { logger } from "../utils/logger";
import type {
  AIProvider,
  GenerateEmbeddingParams,
  GenerateEmbeddingResult,
  GenerateTextParams,
  GenerateTextResult,
} from "./types";

/**
 * Deterministic template explainer.
 *
 * Used when no LLM provider is configured (or as a graceful fallback). It
 * renders natural-language explanations directly from structured intelligence
 * data — it never invents numbers or sources. This keeps the product fully
 * functional offline while clearly labeling responses as template-generated.
 */
export class TemplateProvider implements AIProvider {
  readonly id = "template";

  isConfigured(): boolean {
    return true;
  }

  async generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
    // The template explainer inspects the structured context embedded in the
    // prompt and renders a deterministic summary. See templateExplainer.ts.
    const rendered = renderTemplateExplanation(params);
    return { text: rendered, model: "template-explainer", usage: undefined };
  }

  async generateEmbedding(_params: GenerateEmbeddingParams): Promise<GenerateEmbeddingResult> {
    return { embedding: null, model: "none" };
  }

  getLastError() {
    return null;
  }
}

/**
 * Renders a deterministic explanation from the structured context that the
 * assistant service embeds in prompts. The prompt is expected to contain a
 * JSON block with keys: intent, title, summary data, key findings, and
 * suggestions (arrays of objects with a `label` field).
 */
function renderTemplateExplanation(params: GenerateTextParams): string {
  try {
    const jsonMatch = params.prompt.match(/```json\n([\s\S]*?)\n```/);
    const raw = jsonMatch ? jsonMatch[1] : params.prompt;
    const context = JSON.parse(extractJson(raw));
    const parts: string[] = [];

    const intent = (context.intent ?? "analysis").toString().replace(/_/g, " ");
    const title = context.title ? String(context.title) : `AI skills intelligence: ${intent}`;

    parts.push(`${title}.`);
    parts.push("This summary is generated deterministically from the organization's intelligence model (template mode; no LLM was called).");

    if (Array.isArray(context.keyFindings) && context.keyFindings.length > 0) {
      parts.push(
        "Key findings: " +
          context.keyFindings.map((k: { label?: string; detail?: string }) =>
            k.label ? `${k.label}${k.detail ? ` — ${k.detail}` : ""}` : "",
          ).join(". "),
      );
    }

    if (Array.isArray(context.suggestions) && context.suggestions.length > 0) {
      parts.push(
        "Suggested actions: " +
          context.suggestions
            .map((s: { label?: string; detail?: string }) => s.label ?? "")
            .filter(Boolean)
            .join(", "),
      );
    }

    if (context.uncertainty) {
      parts.push(`Note: ${String(context.uncertainty)}`);
    }

    parts.push(
      "All scores are calculated from the underlying Process → Activity → Role → Skill → AI Impact → Future Skill model. No external statistics are claimed.",
    );
    return parts.join("\n");
  } catch (err) {
    logger.warn("template_explainer.fallback", {
      message: err instanceof Error ? err.message : "unparseable prompt",
    });
    return `Here is a deterministic summary based on the organization's structured intelligence data. (Unable to fully parse the provided context: ${
      err instanceof Error ? err.message : "unknown"
    })`;
  }
}

function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("no JSON object found");
  }
  return raw.slice(start, end + 1);
}

export const providerUsesTemplate = () => config.aiProvider === "template";
