/**
 * errors.js — Typed HTTP error classes.
 *
 * Every thrown AppError is caught by the global error handler
 * and serialized into a consistent JSON response.
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 — malformed input
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

// 401 — missing or invalid token
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

// 402 — out of credits
export class NoCreditError extends AppError {
  constructor(message = "No AI credits remaining. Upgrade your plan.") {
    super(message, 402, "NO_CREDITS");
    this.name = "NoCreditError";
  }
}

// 403 — authenticated but not allowed
export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

// 404 — resource not found
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

// 409 — conflict (e.g. duplicate domain)
export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

// 422 — publish/domain business rule violation
export class BusinessError extends AppError {
  constructor(message, code = "BUSINESS_ERROR") {
    super(message, 422, code);
    this.name = "BusinessError";
  }
}

// 429 — rate limited
export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429, "RATE_LIMIT");
    this.name = "RateLimitError";
  }
}

// 503 — third-party service (Vercel, OpenAI, Stripe) unavailable
export class ServiceUnavailableError extends AppError {
  constructor(service = "External service") {
    super(`${service} is currently unavailable. Please try again.`, 503, "SERVICE_UNAVAILABLE");
    this.name = "ServiceUnavailableError";
  }
}
