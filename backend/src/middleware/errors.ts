import { Request, Response, NextFunction } from "express";
import { isAppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (isAppError(err)) {
    const body: Record<string, unknown> = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details !== undefined) {
      (body.error as Record<string, unknown>).details = err.details;
    }
    logger.warn("http.error", {
      requestId: req.requestId,
      code: err.code,
      message: err.message,
      path: req.originalUrl,
    });
    return res.status(err.status).json(body);
  }

  const anyErr = err as { status?: number; code?: string; details?: unknown; message?: string };
  if (anyErr?.status && anyErr?.code) {
    const body: Record<string, unknown> = {
      error: { code: anyErr.code, message: anyErr.message ?? "Request failed" },
    };
    if (anyErr.details !== undefined) body.error = { ...(body.error as object), details: anyErr.details };
    logger.warn("http.error", {
      requestId: req.requestId,
      code: anyErr.code,
      message: anyErr.message,
      path: req.originalUrl,
    });
    return res.status(anyErr.status).json(body);
  }

  if (err instanceof SyntaxError && "body" in (err as object)) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Malformed JSON body" },
    });
  }

  if (err instanceof Error && (err as NodeJS.ErrnoException).code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: { code: "PAYLOAD_TOO_LARGE", message: "Uploaded file exceeds the size limit" },
    });
  }

  logger.error("http.error.unhandled", {
    requestId: req.requestId,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    path: req.originalUrl,
  });
  res.status(500).json({
    error: { code: "INTERNAL", message: "Internal server error" },
  });
}
