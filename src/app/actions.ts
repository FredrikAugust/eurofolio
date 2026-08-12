"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/better-auth";
import { createEurofolioAuth } from "@/server/auth-factory";
import { getDatabase } from "@/server/db/client";
import { getAuthBaseURL, getEnvironment } from "@/server/env";

export async function login(formData: FormData): Promise<void> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/?error=invalid");
  }

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch {
    redirect("/?error=invalid");
  }
  redirect("/");
}

export async function logout(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}

export async function bootstrapOwner(formData: FormData): Promise<void> {
  const environment = getEnvironment();
  if (environment.EUROFOLIO_SETUP_ENABLED !== "true") redirect("/");
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/setup?error=invalid");
  }

  const bootstrapAuth = createEurofolioAuth({
    db: getDatabase(),
    secret: environment.BETTER_AUTH_SECRET,
    baseURL: getAuthBaseURL(environment),
    allowBootstrap: true,
  });
  try {
    await bootstrapAuth.api.signUpEmail({
      body: { name: "Owner", email, password },
      headers: await headers(),
    });
  } catch {
    redirect("/setup?error=invalid");
  }
  redirect("/");
}
