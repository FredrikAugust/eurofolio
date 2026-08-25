import "server-only";

import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { getEnvironment } from "@/server/env";
import * as schema from "@/server/db/schema";
import type { Database } from "@/server/db/types";

let singleton: { client: Client; db: Database } | undefined;

function createDatabase(url: string, authToken?: string) {
  const client = createClient({ url, authToken });
  return { client, db: drizzle(client, { schema }) };
}

export function getDatabase(): Database {
  if (!singleton) {
    const environment = getEnvironment();
    singleton = createDatabase(
      environment.TURSO_DATABASE_URL,
      environment.TURSO_AUTH_TOKEN,
    );
  }
  return singleton.db;
}
