import { migrate } from "drizzle-orm/libsql/migrator";
import { notFound } from "next/navigation";

import { getDatabase } from "@/server/db/client";
import { getEnvironment } from "@/server/env";

export async function POST() {
  if (getEnvironment().EUROFOLIO_SETUP_ENABLED !== "true") notFound();
  await migrate(getDatabase(), { migrationsFolder: "drizzle" });
  return Response.json({ migrated: true });
}
