import OpenAI from "openai";
import { config } from "../config";
import { logger } from "../utils/logger";
import { AiUnavailableError } from "../utils/errors";
import type {
  AIProvider,
  GenerateEmbeddingParams,
  GenerateEmbeddingResult,
  GenerateTextParams,
  GenerateTextResult,
  Usage,
} from "./types";

/**
 * OpenAI provider. Uses gpt-4o-mini (configurable) for text and
 * text-embedding-3-small for embeddings.
 */
export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  private client: OpenAI | null = null;
  private lastError: AiUnavailableError | null = null;

  constructor() {
    if (config.openaiApiKey) {
      this.client = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  private requireClient(): OpenAI {
    if (!this.client) {
      const err = new AiUnavailableError(
        "OpenAI is not configured. Set OPENAI_API_KEY and AI_PROVIDER=openai.",
      );
      this.lastError = err;
      throw err;
    }
    return this.client;
  }

  async generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
    const client = this.requireClient();
    try {
      const started = Date.now();
      const response = await client.chat.completions.create({
        model: params.maxTokens && params.maxTokens <= 2048 ? config.aiModel : config.aiModel,
        temperature: params.temperature ?? 0.3,
        max_tokens: params.maxTokens ?? 700,
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.prompt },
        ],
      });
      logger.debug("openai.generate_text", {
        latencyMs: Date.now() - started,
        model: config.aiModel,
        tokens: response.usage,
      });
      const usage: Usage = {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      };
      const text = response.choices[0]?.message?.content ?? "";
      return { text, model: config.aiModel, usage };
    } catch (err) {
      const wrapped = new AiUnavailableError(
        `OpenAI text generation failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
      this.lastError = wrapped;
      logger.error("openai.generate_text_failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      throw wrapped;
    }
  }

  async generateEmbedding(params: GenerateEmbeddingParams): Promise<GenerateEmbeddingResult> {
    const client = this.requireClient();
    try {
      const started = Date.now();
      const response = await client.embeddings.create({
        model: config.embeddingModel,
        input: params.text.slice(0, 8000),
      });
      logger.debug("openai.generate_embedding", {
        latencyMs: Date.now() - started,
        model: config.embeddingModel,
      });
      return { embedding: response.data[0]?.embedding ?? [], model: config.embeddingModel };
    } catch (err) {
      const wrapped = new AiUnavailableError(
        `OpenAI embedding failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
      this.lastError = wrapped;
      logger.error("openai.embedding_failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      throw wrapped;
    }
  }

  getLastError() {
    return this.lastError;
  }
}
