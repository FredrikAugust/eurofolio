export type DomainErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "ARCHIVED"
  | "CURRENCY_MISMATCH"
  | "UNSUPPORTED_SHORT"
  | "VALIDATION_ERROR";

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
