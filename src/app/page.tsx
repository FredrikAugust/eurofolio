import { headers } from "next/headers";
import Link from "next/link";

import { login, logout } from "@/app/actions";
import { PortfolioChart } from "@/app/portfolio-chart";
import { auth } from "@/server/better-auth";
import { getDatabase } from "@/server/db/client";
import { formatDecimal } from "@/server/domain/decimal";
import { getEnvironment } from "@/server/env";
import { queryPortfolioDashboard, type PortfolioHistoryPoint, type PortfolioSummary } from "@/server/services/portfolio-query";

export const dynamic = "force-dynamic";

function money(value: string | null, currency = "EUR"): string {
  if (value === null) return "Not valued";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(formatDecimal(value, 2)));
}

function freshnessLabel(value: string): string {
  return value === "manual" ? "Manual override" : value[0].toUpperCase() + value.slice(1);
}

function Login({ invalid }: { invalid: boolean }) {
  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-heading">
        <div className="brand-mark" aria-hidden="true">€</div>
        <p className="eyebrow">Private portfolio</p>
        <h1 id="login-heading">Welcome to Eurofolio</h1>
        <p className="lede">One quiet view of every account, reported in euros.</p>
        <form action={login} className="login-form">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" minLength={12} autoComplete="current-password" required />
          {invalid ? <p className="form-error" role="alert">That email or password was not accepted.</p> : null}
          <button type="submit">Open portfolio</button>
        </form>
        <p className="privacy-note">Protected by Better Auth with a secure, HttpOnly session.</p>
      </section>
    </main>
  );
}

function EmptyDashboard() {
  return (
    <section className="empty-state">
      <p className="eyebrow">Ready for data</p>
      <h2>Your portfolio is empty</h2>
      <p>Create an account and instrument through the Eurofolio MCP server, then record your first deposit or purchase.</p>
      <code>/mcp</code>
    </section>
  );
}

function Dashboard({ summary, history }: { summary: PortfolioSummary; history: PortfolioHistoryPoint[] }) {
  const allocationTotal = Number(summary.eurTotal) || 1;
  return (
    <>
      <section className="hero-grid">
        <div className="hero-value">
          <p className="eyebrow">Consolidated value</p>
          <p className="total-value">{money(summary.eurTotal)}</p>
          <div className="status-line">
            <span className={`status-dot ${summary.complete ? "complete" : "partial"}`} />
            {summary.complete ? "Complete valuation" : `Partial · ${summary.missing.length} gap${summary.missing.length === 1 ? "" : "s"}`}
            <span aria-hidden="true">·</span>
            {summary.valuationDate}
          </div>
        </div>
        <div className="allocation-card">
          <p className="eyebrow">Allocation</p>
          {summary.allocation.length ? summary.allocation.map((item) => (
            <div className="allocation-row" key={item.assetClass}>
              <div><span>{item.assetClass}</span><strong>{money(item.eurValue)}</strong></div>
              <div className="allocation-track"><span style={{ width: `${Math.max(2, (Number(item.eurValue) / allocationTotal) * 100)}%` }} /></div>
            </div>
          )) : <p className="muted">No valued assets yet.</p>}
        </div>
      </section>

      {history.length >= 2 ? <section className="section-block chart-card" aria-labelledby="history-heading"><div className="section-heading"><div><p className="eyebrow">Monthly snapshots</p><h2 id="history-heading">Portfolio history</h2></div><span>{history.length}</span></div><PortfolioChart data={history} /><p className="chart-summary">From {money(String(history[0].value))} to {money(String(history.at(-1)?.value ?? 0))}.</p></section> : null}

      <section className="section-block" aria-labelledby="accounts-heading">
        <div className="section-heading"><div><p className="eyebrow">Across institutions</p><h2 id="accounts-heading">Accounts</h2></div><span>{summary.accountTotals.length}</span></div>
        <div className="account-grid">
          {summary.accountTotals.map((account) => (
            <article className="account-card" key={account.accountId}>
              <h3>{account.accountName}</h3><p>{money(account.eurValue)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block" aria-labelledby="holdings-heading">
        <div className="section-heading"><div><p className="eyebrow">Current positions</p><h2 id="holdings-heading">Holdings</h2></div><span>{summary.holdings.length}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Instrument</th><th>Position</th><th>Native value</th><th>EUR value</th><th>Data</th></tr></thead>
            <tbody>
              {summary.holdings.map((holding) => (
                <tr key={`${holding.accountId}:${holding.instrumentId}`}>
                  <td><strong>{holding.instrumentName}</strong><small>{holding.accountName} · {holding.assetClass}</small></td>
                  <td>{holding.quantity}<small>{holding.price ? `@ ${money(holding.price, holding.nativeCurrency)}` : "Price missing"}</small></td>
                  <td>{money(holding.nativeValue, holding.nativeCurrency)}</td>
                  <td><strong>{money(holding.eurValue)}</strong></td>
                  <td><span className={`freshness ${holding.priceFreshness}`}>{freshnessLabel(holding.priceFreshness)}</span><small>{holding.priceProvider ?? "No source"} · {holding.priceDate ?? "No date"}</small>{holding.nativeCurrency !== "EUR" ? <small>FX: {holding.fxProvider ?? "missing"} · {holding.fxDate ?? "no date"}</small> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {summary.cash.length ? <section className="section-block" aria-labelledby="cash-heading"><div className="section-heading"><div><p className="eyebrow">Uninvested balances</p><h2 id="cash-heading">Cash</h2></div></div><div className="cash-grid">{summary.cash.map((item) => <article className="cash-card" key={`${item.accountId}:${item.currency}`}><span>{item.accountName} · {item.currency}</span><strong>{money(item.nativeValue, item.currency)}</strong><small>{item.eurValue === null ? "FX missing" : `${money(item.eurValue)} · ${item.fxProvider}`}</small></article>)}</div></section> : null}

      {summary.missing.length ? <section className="warning-panel" aria-labelledby="gaps-heading"><p className="eyebrow">Needs attention</p><h2 id="gaps-heading">Valuation gaps</h2><ul>{summary.missing.map((item, index) => <li key={`${item.kind}:${index}`}>{item.message}</li>)}</ul></section> : null}
    </>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const session = await auth.api.getSession({ headers: await headers() });
  const params = await searchParams;
  if (!session) return <Login invalid={params.error === "invalid"} />;

  const environment = getEnvironment();
  const valuationDate = new Date().toISOString().slice(0, 10);
  const options = {
    priceStaleAfterDays: environment.PRICE_STALE_AFTER_DAYS,
    fxStaleAfterDays: environment.FX_STALE_AFTER_DAYS,
  };
  const { summary, history } = await queryPortfolioDashboard(
    getDatabase(),
    valuationDate,
    options,
  );
  const hasData = summary.accountTotals.length || summary.holdings.length || summary.cash.length;
  return (
    <div className="app-shell">
      <header className="topbar"><Link href="/" className="brand"><span>€</span> Eurofolio</Link><nav aria-label="Portfolio navigation"><a href="#accounts-heading">Accounts</a><a href="#holdings-heading">Holdings</a><form action={logout}><button type="submit" className="text-button">Sign out</button></form></nav></header>
      <main className="dashboard">{hasData ? <Dashboard summary={summary} history={history} /> : <EmptyDashboard />}</main>
      <footer><span>EUR master currency</span><span>Delayed market data · Not investment advice</span></footer>
    </div>
  );
}
