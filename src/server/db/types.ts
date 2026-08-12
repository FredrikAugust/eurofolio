import type { LibSQLDatabase } from "drizzle-orm/libsql";

import type * as schema from "@/server/db/schema";

export type Database = LibSQLDatabase<typeof schema>;
