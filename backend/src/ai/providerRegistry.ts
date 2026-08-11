import { config } from "../config";
import { logger } from "../utils/logger";
import { OpenAIProvider } from "./openaiProvider";
import { TemplateProvider } from "./templateProvider";
import type { AIProvider } from "./types";

let provider: AIProvider | null = null;

/** Resolve the configured AI provider. */
export function getAIProvider(): AIProvider {
  if (provider) return provider;
  const requested = config.aiProvider;
  if (requested === "openai") {
    const openai = new OpenAIProvider();
    if (openai.isConfigured()) {
      provider = openai;
    } else {
      logger.warn("ai.provider_openai_not_configured", {
        fallback: "template",
      });
      provider = new TemplateProvider();
    }
  } else {
    provider = new TemplateProvider();
  }
  return provider;
}

export function isLLMConfigured(): boolean {
  return getAIProvider().id === "openai";
}

export function resetProviderForTests(providerImpl?: AIProvider | null): void {
  provider = providerImpl ?? null;
}
