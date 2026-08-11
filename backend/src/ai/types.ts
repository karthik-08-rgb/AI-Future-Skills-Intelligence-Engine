import type { AppError } from "../utils/errors";

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface GenerateTextParams {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateTextResult {
  text: string;
  model: string;
  usage?: Usage;
}

export interface GenerateEmbeddingParams {
  text: string;
}

export interface GenerateEmbeddingResult {
  embedding: number[] | null; // null when provider cannot embed (e.g. template)
  model: string;
}

/**
 * AI provider abstraction. Business logic depends only on this interface so
 * OpenAI, Claude, Gemini, or local providers can be plugged in later.
 */
export interface AIProvider {
  readonly id: string;
  isConfigured(): boolean;
  generateText(params: GenerateTextParams): Promise<GenerateTextResult>;
  generateEmbedding(params: GenerateEmbeddingParams): Promise<GenerateEmbeddingResult>;
  getLastError(): AppError | null;
}
