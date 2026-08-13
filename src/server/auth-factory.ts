import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { count } from "drizzle-orm";

import { account, session, user, verification } from "@/server/db/schema";
import type { Database } from "@/server/db/types";

type AuthFactoryOptions = {
  db: Database;
  secret: string;
  baseURL: string;
  allowBootstrap?: boolean;
};

export function createEurofolioAuth({
  db,
  secret,
  baseURL,
  allowBootstrap = false,
}: AuthFactoryOptions) {
  return betterAuth({
    appName: "Eurofolio",
    baseURL,
    secret,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowBootstrap,
      minPasswordLength: 12,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 300,
        strategy: "compact",
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async () => {
            const [result] = await db.select({ value: count() }).from(user);
            return result.value === 0;
          },
        },
      },
    },
    advanced: {
      cookiePrefix: "eurofolio",
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    plugins: [nextCookies()],
  });
}
