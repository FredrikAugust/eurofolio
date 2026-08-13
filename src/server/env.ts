import "server-only";

import { z } from "zod";

const environmentSchema = z.object({
  TURSO_DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("libsql://") ||
        value.startsWith("https://") ||
        value.startsWith("file:"),
      "Must be a libsql, https, or file URL",
    ),
  TURSO_AUTH_TOKEN: z.string().min(1).optional(),
  EUROFOLIO_OWNER_TOKEN: z.string().min(32),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  CRON_SECRET: z.string().min(32),
  BACKFILL_SECRET: z.string().min(32).optional(),
  TWELVE_DATA_API_KEY: z.string().min(1).optional(),
  PRICE_STALE_AFTER_DAYS: z.coerce.number().int().min(1).max(31).default(5),
  FX_STALE_AFTER_DAYS: z.coerce.number().int().min(1).max(31).default(3),
});

export type ServerEnvironment = z.infer<typeof environmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function getEnvironment(): ServerEnvironment {
  cachedEnvironment ??= environmentSchema.parse({
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || undefined,
    EUROFOLIO_OWNER_TOKEN: process.env.EUROFOLIO_OWNER_TOKEN,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    BACKFILL_SECRET: process.env.BACKFILL_SECRET || undefined,
    TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY || undefined,
    PRICE_STALE_AFTER_DAYS: process.env.PRICE_STALE_AFTER_DAYS,
    FX_STALE_AFTER_DAYS: process.env.FX_STALE_AFTER_DAYS,
  });

  return cachedEnvironment;
}

export function getAuthBaseURL(environment = getEnvironment()): string {
  const deploymentHost = process.env.VERCEL_URL;
  return deploymentHost ? `https://${deploymentHost}` : environment.BETTER_AUTH_URL;
}

export function resetEnvironmentForTests(): void {
  cachedEnvironment = undefined;
}
