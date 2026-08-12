import { count } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { bootstrapOwner } from "@/app/actions";
import { getDatabase } from "@/server/db/client";
import { user } from "@/server/db/schema";
import { getEnvironment } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function Setup({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const environment = getEnvironment();
  if (environment.EUROFOLIO_SETUP_ENABLED !== "true") notFound();
  const [existing] = await getDatabase().select({ value: count() }).from(user);
  if (existing.value !== 0) redirect("/");
  const params = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="setup-heading">
        <div className="brand-mark" aria-hidden="true">€</div>
        <p className="eyebrow">One-time setup</p>
        <h1 id="setup-heading">Create the owner</h1>
        <p className="lede">Choose the only dashboard login Eurofolio will allow.</p>
        <form action={bootstrapOwner} className="login-form">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" minLength={12} autoComplete="new-password" required />
          {params.error === "invalid" ? <p className="form-error" role="alert">Could not create the owner. Use a valid email and at least 12 characters.</p> : null}
          <button type="submit">Create owner</button>
        </form>
        <p className="privacy-note">This screen permanently closes after the first owner is saved.</p>
      </section>
    </main>
  );
}
