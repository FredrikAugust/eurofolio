import "server-only";

import { createEurofolioAuth } from "@/server/auth-factory";
import { getDatabase } from "@/server/db/client";
import { getAuthBaseURL, getEnvironment } from "@/server/env";

const environment = getEnvironment();

export const auth = createEurofolioAuth({
  db: getDatabase(),
  secret: environment.BETTER_AUTH_SECRET,
  baseURL: getAuthBaseURL(environment),
  allowBootstrap: process.env.BETTER_AUTH_ALLOW_BOOTSTRAP === "true",
});
