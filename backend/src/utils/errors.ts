/**
 * Application error hierarchy. Controllers translate these into HTTP responses.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TENANT_MISMATCH"
  | "RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL";

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  details?: unknown;
  status: number;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly status: number;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.details = options.details;
    this.status = options.status;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: "VALIDATION_ERROR", message, details, status: 400 });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super({ code: "UNAUTHORIZED", message, status: 401 });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super({ code: "FORBIDDEN", message, status: 403 });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super({ code: "NOT_FOUND", message, status: 404 });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super({ code: "CONFLICT", message, status: 409 });
  }
}

export class TenantMismatchError extends AppError {
  constructor(message = "Resource does not belong to your organization") {
    super({ code: "TENANT_MISMATCH", message, status: 404 });
  }
}

export class AiUnavailableError extends AppError {
  constructor(message = "AI provider is currently unavailable") {
    super({ code: "AI_UNAVAILABLE", message, status: 503 });
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "Payload too large") {
    super({ code: "PAYLOAD_TOO_LARGE", message, status: 413 });
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
