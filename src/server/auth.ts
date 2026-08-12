import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function secureEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export function verifyOwnerToken(candidate: string | undefined, expected: string): boolean {
  return typeof candidate === "string" && candidate.length >= 32 && secureEqual(candidate, expected);
}

export function redactSecrets(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(token|secret|authorization)(["'=:\s]+)[^\s,"}]+/gi, "$1$2[REDACTED]");
}

type FailureWindow = { count: number; resetsAt: number };
const failures = new Map<string, FailureWindow>();

export function allowAuthenticationAttempt(key: string, now = Date.now()): boolean {
  const current = failures.get(key);
  if (!current || current.resetsAt <= now) {
    failures.set(key, { count: 1, resetsAt: now + 60_000 });
    if (failures.size > 500) failures.delete(failures.keys().next().value ?? "");
    return true;
  }
  current.count += 1;
  return current.count <= 10;
}

export function clearAuthenticationFailures(key: string): void {
  failures.delete(key);
}
