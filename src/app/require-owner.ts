import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/better-auth";

export async function requireOwner() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}
