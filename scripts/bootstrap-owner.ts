import { count } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { createEurofolioAuth } from "@/server/auth-factory";
import * as schema from "@/server/db/schema";

async function main() {
  process.env.BETTER_AUTH_ALLOW_BOOTSTRAP = "true";

  const email = process.env.EUROFOLIO_OWNER_EMAIL;
  const password = process.env.EUROFOLIO_OWNER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "EUROFOLIO_OWNER_EMAIL and EUROFOLIO_OWNER_PASSWORD are required.",
    );
  }

  const databaseURL = process.env.TURSO_DATABASE_URL;
  const authSecret = process.env.BETTER_AUTH_SECRET;
  const authURL = process.env.BETTER_AUTH_URL;
  if (!databaseURL || !authSecret || !authURL) {
    throw new Error(
      "TURSO_DATABASE_URL, BETTER_AUTH_SECRET, and BETTER_AUTH_URL are required.",
    );
  }
  const client = createClient({
    url: databaseURL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });
  const [existing] = await db.select({ value: count() }).from(schema.user);
  if (existing.value !== 0) {
    client.close();
    throw new Error("Owner already exists; Eurofolio allows exactly one user.");
  }

  const auth = createEurofolioAuth({
    db,
    secret: authSecret,
    baseURL: authURL,
    allowBootstrap: true,
  });
  await auth.api.signUpEmail({
    body: { name: "Owner", email, password },
  });
  client.close();
  console.log(`Created Eurofolio owner ${email}. Public signup remains disabled.`);
}

void main();
