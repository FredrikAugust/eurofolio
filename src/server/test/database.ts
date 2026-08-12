import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import * as schema from "@/server/db/schema";
import type { Database } from "@/server/db/types";

export async function createTestDatabase(): Promise<{
  db: Database;
  close: () => void;
}> {
  const client = createClient({ url: "file::memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return { db, close: () => client.close() };
}
