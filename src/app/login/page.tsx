import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { login } from "@/app/actions";
import { auth } from "@/server/better-auth";

type LoginPageProps = { searchParams: Promise<{ error?: string }> };

function Login({ invalid }: { invalid: boolean }) {
  return (
    <main className="login-shell">
      <section className="login-sheet" aria-labelledby="login-heading">
        <div className="login-axis" aria-hidden="true"><span>WGT</span><span>700</span></div>
        <div className="login-content">
          <Link href="/login" className="login-brand">Eurofolio</Link>
          <h1 id="login-heading">Sign in</h1>
          <p>Private portfolio register · EUR reporting</p>
          <form action={login} className="login-form">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={12} autoComplete="current-password" required />
            {invalid ? <p className="form-error" role="alert">Email or password not accepted.</p> : null}
            <button type="submit">Sign in</button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<Login invalid={false} />}>
      <LoginGate searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginGate({ searchParams }: LoginPageProps) {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");
  const params = await searchParams;
  return <Login invalid={params.error === "invalid"} />;
}
