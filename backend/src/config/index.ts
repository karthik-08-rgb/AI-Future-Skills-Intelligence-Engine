import "dotenv/config";

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  backendUrl: process.env.BACKEND_URL ?? "http://localhost:4000",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
  jwtExpiresIn: Number(process.env.JWT_EXPIRES_IN ?? 604800),
  aiProvider: process.env.AI_PROVIDER ?? "template",
  aiModel: process.env.AI_MODEL ?? "gpt-4o-mini",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  maxDocumentSizeBytes: Number(process.env.MAX_DOCUMENT_SIZE_BYTES ?? 5 * 1024 * 1024),
  logLevel: process.env.LOG_LEVEL ?? "info",
  demoSeedPassword: process.env.DEMO_SEED_PASSWORD ?? "demo1234",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
};
