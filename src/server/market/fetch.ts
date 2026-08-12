export async function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit = {},
  timeoutMilliseconds = 8_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMilliseconds);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
