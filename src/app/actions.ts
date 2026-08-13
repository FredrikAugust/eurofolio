"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/better-auth";

export async function login(formData: FormData): Promise<void> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/login?error=invalid");
  }

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch {
    redirect("/login?error=invalid");
  }
  redirect("/");
}

export async function logout(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
