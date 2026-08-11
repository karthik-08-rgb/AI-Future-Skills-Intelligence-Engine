import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";
import { NotFoundError, ValidationError } from "../utils/errors";
import { normalizeName } from "../utils/math";
import { getAIProvider } from "../ai/providerRegistry";

// ---------------------------------------------------------------------------
// Text processing
// ---------------------------------------------------------------------------

const TOKEN_PATTERN = /[\w]+/g;

export function countTokens(text: string): number {
  const matches = text.match(TOKEN_PATTERN);
  return matches?.length ?? 0;
}

/**
 * Deterministic chunking: splits text into overlapping windows by word
 * boundaries, aiming for maxTokens per chunk with a configurable overlap.
 */
export function chunkText(
  text: string,
  maxTokens = 400,
  overlapTokens = 60,
): { content: string; tokenCount: number }[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
  const words = clean.split(" ");
  if (words.length === 0) return [];

  const chunks: { content: string; tokenCount: number }[] = [];
  const step = Math.max(1, maxTokens - overlapTokens);
  let index = 0;

  while (index < words.length) {
    const slice = words.slice(index, index + maxTokens);
    const content = slice.join(" ");
    if (content.length > 0) {
      chunks.push({ content, tokenCount: countTokens(content) });
    }
    index += step;
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// File parsing
// ---------------------------------------------------------------------------

export async function parseFileContent(
  buffer: Buffer,
  filename: string,
  sourceType: string,
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (sourceType === "csv" || ext === "csv") {
    return buffer.toString("utf8");
  }
  if (sourceType === "json" || ext === "json") {
    try {
      const parsed = JSON.parse(buffer.toString("utf8"));
      return JSON.stringify(parsed, null, 2);
    } catch {
      throw new ValidationError("Invalid JSON file: could not parse content");
    }
  }
  if (sourceType === "text" || ext === "txt") {
    return buffer.toString("utf8");
  }
  if (sourceType === "markdown" || ext === "md" || ext === "markdown") {
    return buffer.toString("utf8");
  }
  if (sourceType === "pdf" || ext === "pdf") {
    throw new ValidationError(
      "PDF ingestion is not enabled in this build. Convert the document to text/markdown or CSV and upload that.",
    );
  }
  return buffer.toString("utf8");
}

// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

export async function createKnowledgeSource(input: {
  organizationId: string | null;
  industryId?: string | null;
  title: string;
  source: string;
  sourceType: string;
  documentType?: string;
  trustLevel?: number;
  metadata?: unknown;
  createdById?: string | null;
}) {
  return prisma.knowledgeSource.create({
    data: {
      organizationId: input.organizationId,
      industryId: input.industryId ?? null,
      title: input.title,
      source: input.source,
      sourceType: input.sourceType,
      documentType: input.documentType ?? "report",
      trustLevel: input.trustLevel ?? 0.5,
      metadata: (input.metadata as object | undefined) ?? undefined,
      createdById: input.createdById ?? null,
      status: "PROCESSING",
    },
  });
}

export async function listKnowledgeSources(organizationId: string | null) {
  return prisma.knowledgeSource.findMany({
    where: organizationId ? { organizationId } : {},
    include: { _count: { select: { documents: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteKnowledgeSource(organizationId: string | null, id: string) {
  const existing = await prisma.knowledgeSource.findFirst({
    where: { id, ...(organizationId ? { organizationId } : {}) },
  });
  if (!existing) throw new NotFoundError("Knowledge source not found");
  await prisma.knowledgeSource.delete({ where: { id } });
}

/**
 * Ingests raw text into the knowledge base:
 * parse -> chunk -> embed -> store. Embeddings are best-effort: if the
 * configured provider cannot embed (e.g. template mode), chunks are stored
 * without vectors and retrieval falls back to keyword scoring.
 */
export async function ingestText(input: {
  organizationId: string | null;
  industryId?: string | null;
  title: string;
  source: string;
  sourceType: string;
  documentType?: string;
  trustLevel?: number;
  text: string;
  metadata?: unknown;
}) {
  const chunks = chunkText(input.text);
  if (chunks.length === 0) {
    throw new ValidationError("Document has no extractable content");
  }

  const source = await createKnowledgeSource({
    organizationId: input.organizationId,
    industryId: input.industryId ?? null,
    title: input.title,
    source: input.source,
    sourceType: input.sourceType,
    documentType: input.documentType,
    trustLevel: input.trustLevel,
    metadata: input.metadata,
  });

  const document = await prisma.knowledgeDocument.create({
    data: {
      sourceId: source.id,
      title: input.title,
      documentType: input.documentType ?? "report",
      status: "PROCESSING",
    },
  });

  const provider = getAIProvider();
  const canEmbed = provider.id === "openai";
  let embedded = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let embedding: string | null = null;
    if (canEmbed) {
      try {
        const result = await provider.generateEmbedding({ text: chunk.content });
        embedding = result.embedding ? JSON.stringify(result.embedding) : null;
        embedded++;
      } catch (err) {
        logger.warn("rag.embedding_failed", {
          message: err instanceof Error ? err.message : "embedding error",
        });
        embedding = null;
      }
    }
    await prisma.documentChunk.create({
      data: {
        documentId: document.id,
        content: chunk.content,
        chunkIndex: i,
        tokenCount: chunk.tokenCount,
        embedding,
        metadata: { sourceType: input.sourceType },
      },
    });
  }

  await prisma.knowledgeDocument.update({
    where: { id: document.id },
    data: { status: "READY", chunkCount: chunks.length },
  });
  await prisma.knowledgeSource.update({
    where: { id: source.id },
    data: { status: "READY", chunkCount: chunks.length },
  });

  logger.info("rag.ingested", {
    organizationId: input.organizationId,
    chunks: chunks.length,
    embedded,
  });

  return { source, document, chunkCount: chunks.length, embedded };
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

interface RetrievedChunk {
  chunkId: string;
  content: string;
  score: number;
  sourceTitle: string;
  sourceType: string;
  trustLevel: number;
  documentId: string;
  chunkIndex: number;
  metadata: unknown;
}

function keywordScore(queryTokens: string[], text: string): number {
  const normalizedText = normalizeName(text);
  let score = 0;
  for (const token of queryTokens) {
    const normalized = normalizeName(token);
    if (!normalized) continue;
    if (normalizedText.includes(normalized)) score += 1;
  }
  if (score === 0) return 0;
  return score / queryTokens.length;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function retrieveChunks(input: {
  organizationId: string | null;
  query: string;
  k?: number;
}): Promise<{ chunks: RetrievedChunk[]; mode: "semantic" | "keyword"; queryEmbedded: boolean }> {
  const { organizationId, query, k = 5 } = input;
  const queryTokens = query.split(/\s+/).filter(Boolean);

  const chunks = await prisma.documentChunk.findMany({
    where: { document: { source: organizationId ? { organizationId } : {} } },
    include: { document: { include: { source: true } } },
  });

  if (chunks.length === 0) {
    return { chunks: [], mode: "keyword", queryEmbedded: false };
  }

  const provider = getAIProvider();
  let queryEmbedding: number[] | null = null;
  if (provider.id === "openai") {
    try {
      const result = await provider.generateEmbedding({ text: query });
      queryEmbedding = result.embedding;
    } catch {
      queryEmbedding = null;
    }
  }

  const scored: Array<RetrievedChunk & { rawScore: number; hasVector: boolean }> = chunks.map(
    (chunk) => {
      const keyword = keywordScore(queryTokens, chunk.content);
      let vector = 0;
      let hasVector = false;
      if (queryEmbedding && chunk.embedding) {
        try {
          const stored = JSON.parse(chunk.embedding) as number[];
          vector = cosineSimilarity(queryEmbedding, stored);
          hasVector = true;
        } catch {
          hasVector = false;
        }
      }
      const semantic = hasVector ? vector : keyword;
      const rawScore = hasVector ? 0.65 * semantic + 0.35 * keyword : keyword;
      return {
        chunkId: chunk.id,
        content: chunk.content.slice(0, 2000),
        rawScore,
        score: 0,
        hasVector,
        sourceTitle: chunk.document.source.title,
        sourceType: chunk.document.source.sourceType,
        trustLevel: chunk.document.source.trustLevel,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        metadata: chunk.metadata,
      };
    },
  );

  const ranked = scored
    .filter((s) => s.rawScore > 0.01)
    .sort((a, b) => {
      const trust = b.trustLevel - a.trustLevel;
      if (trust !== 0 && Math.abs(b.rawScore - a.rawScore) < 0.15) return trust;
      return b.rawScore - a.rawScore;
    })
    .slice(0, k)
    .map((s, i) => ({
      chunkId: s.chunkId,
      content: s.content,
      score: Math.round(s.rawScore * 100) / 100,
      sourceTitle: s.sourceTitle,
      sourceType: s.sourceType,
      trustLevel: s.trustLevel,
      documentId: s.documentId,
      chunkIndex: s.chunkIndex,
      metadata: s.metadata,
    }));

  return {
    chunks: ranked,
    mode: queryEmbedding && ranked.some((r) => r.score > 0) ? "semantic" : "keyword",
    queryEmbedded: Boolean(queryEmbedding),
  };
}
