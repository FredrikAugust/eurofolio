import { headers } from "next/headers";
import Link from "next/link";

import { login, logout } from "@/app/actions";
import { PortfolioChart } from "@/app/portfolio-chart";
import { auth } from "@/server/better-auth";
import { getDatabase } from "@/server/db/client";
import { formatDecimal } from "@/server/domain/decimal";
import { getEnvironment } from "@/server/env";
import {
  queryPortfolioDashboard,
  type PortfolioHistoryPoint,
  type PortfolioSummary,
  type ValuedHolding,
} from "@/server/services/portfolio-query";

export const dynamic = "force-dynamic";

const accountColors: Record<string, string> = {
  Endavu: "#f04d23",
  Nordnet: "#1748ba",
  Revolut: "#0c0c0d",
};
const chartColors = ["#f04d23", "#1748ba", "#0c0c0d", "#657080"];

function money(value: string | null, currency = "EUR"): string {
  if (value === null) return "Not valued";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(formatDecimal(value, 2)));
}

function quantity(value: string, maximumFractionDigits = 4): string {
  return new Intl.NumberFormat("en-IE", { maximumFractionDigits }).format(Number(value));
}

function percent(part: string | number, total: string | number): string {
  const denominator = Number(total);
  return denominator ? `${((Number(part) / denominator) * 100).toFixed(1)}%` : "0.0%";
}

function displayDate(value: string, stacked = false): string | string[] {
  const date = new Date(`${value}T12:00:00Z`);
  if (stacked) {
    return [
      new Intl.DateTimeFormat("en-IE", { day: "numeric" }).format(date),
      new Intl.DateTimeFormat("en-IE", { month: "short" }).format(date),
      new Intl.DateTimeFormat("en-IE", { year: "numeric" }).format(date),
    ];
  }
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function freshnessLabel(value: string): string {
  return value === "manual" ? "Manual" : value[0].toUpperCase() + value.slice(1);
}

function latestObservation(summary: PortfolioSummary): string {
  return [
    ...summary.holdings.map((holding) => holding.priceDate),
    ...summary.holdings.map((holding) => holding.fxDate),
    ...summary.cash.map((cash) => cash.fxDate),
  ]
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1) ?? summary.valuationDate;
}

function Login({ invalid }: { invalid: boolean }) {
  return (
    <main className="login-shell">
      <section className="login-sheet" aria-labelledby="login-heading">
        <div className="login-axis" aria-hidden="true"><span>WGT</span><span>700</span></div>
        <div className="login-content">
          <Link href="/" className="login-brand">Eurofolio</Link>
          <h1 id="login-heading">Sign in</h1>
          <p>Private portfolio register · EUR reporting</p>
          <form action={login} className="login-form">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={12} autoComplete="current-password" required />
            {invalid ? <p className="form-error" role="alert">Email or password not accepted.</p> : null}
            <button type="submit">Sign in →</button>
          </form>
        </div>
      </section>
    </main>
  );
}

function EmptyDashboard() {
  return (
    <section className="empty-sheet">
      <h1>No portfolio data</h1>
      <p>Create the first account and position through Eurofolio MCP.</p>
      <code>/mcp</code>
    </section>
  );
}

function RegisterRow({ holding, rank }: { holding: ValuedHolding; rank: number }) {
  return (
    <tr>
      <td className="rank-cell">{String(rank).padStart(2, "0")}</td>
      <td>
        <strong>{holding.instrumentName}</strong>
        <small>{holding.accountName} · {holding.assetClass}</small>
      </td>
      <td className="number-cell">{quantity(holding.quantity)}</td>
      <td className="number-cell">
        {holding.price ? money(holding.price, holding.nativeCurrency) : "—"}
        <small>{holding.priceDate ? displayDate(holding.priceDate) : "Price missing"}</small>
      </td>
      <td className="number-cell">{money(holding.nativeValue, holding.nativeCurrency)}</td>
      <td className="number-cell"><strong>{money(holding.eurValue)}</strong></td>
      <td>
        <span className={`source-state ${holding.priceFreshness}`}>{freshnessLabel(holding.priceFreshness)}</span>
        <small>{holding.priceProvider ?? "No source"}</small>
      </td>
    </tr>
  );
}

function MobileRegisterRow({ holding, rank }: { holding: ValuedHolding; rank: number }) {
  return (
    <details className="mobile-position">
      <summary>
        <span className="mobile-rank">{String(rank).padStart(2, "0")}</span>
        <span className="mobile-name"><strong>{holding.instrumentName}</strong><small>{holding.accountName} · {holding.assetClass}</small></span>
        <span className="number-cell"><strong>{money(holding.eurValue)}</strong><small>{quantity(holding.quantity)} units</small></span>
      </summary>
      <dl>
        <div><dt>Price</dt><dd>{holding.price ? money(holding.price, holding.nativeCurrency) : "Missing"}</dd></div>
        <div><dt>Native value</dt><dd>{money(holding.nativeValue, holding.nativeCurrency)}</dd></div>
        <div><dt>Observation</dt><dd>{holding.priceDate ? displayDate(holding.priceDate) : "Missing"}</dd></div>
        <div><dt>Source</dt><dd>{holding.priceProvider ?? "Missing"} · {freshnessLabel(holding.priceFreshness)}</dd></div>
      </dl>
    </details>
  );
}

function Dashboard({ summary, history }: { summary: PortfolioSummary; history: PortfolioHistoryPoint[] }) {
  const total = Number(summary.eurTotal) || 1;
  const observedOn = latestObservation(summary);
  const observedParts = displayDate(observedOn, true) as string[];
  const valuedHistory = history.filter((point) => point.complete);
  const topHoldings = summary.holdings.filter((holding) => holding.eurValue !== null).slice(0, 3);

  return (
    <>
      <div className="measure-axis" aria-hidden="true">
        <span>WIDTH</span><span>75</span><i /><span>100</span><span>125</span><span>150</span>
      </div>

      <section className="value-field" aria-labelledby="portfolio-heading">
        <div className="weight-axis" aria-hidden="true"><span>WGT</span><b>900</b><i>700</i></div>
        <div className="value-lockup">
          <span className="wordmark">Eurofolio</span>
          <h1 id="portfolio-heading">{money(summary.eurTotal)}</h1>
        </div>
        <div className={`valuation-block ${summary.complete ? "complete" : "partial"}`}>
          <span>{summary.complete ? "Fully valued" : "Partial valuation"}</span>
          <i aria-hidden="true" />
          <time dateTime={observedOn}>{observedParts.map((part) => <b key={part}>{part}</b>)}</time>
          {!summary.complete ? <small>{summary.missing.length} gap{summary.missing.length === 1 ? "" : "s"}</small> : null}
        </div>
      </section>

      <section className="account-register" id="accounts-heading" aria-labelledby="account-register-heading">
        <h2 className="sr-only" id="account-register-heading">Accounts</h2>
        {summary.accountTotals.map((account, index) => (
          <div className="account-line" style={{ color: accountColors[account.accountName] ?? "#0c0c0d" }} key={account.accountId}>
            <span className="register-rank">{String(index + 1).padStart(2, "0")}</span>
            <strong>{account.accountName}</strong>
            <span className="account-value">{money(account.eurValue)}</span>
            <span className="account-percent">{percent(account.eurValue, summary.eurTotal)}</span>
          </div>
        ))}
      </section>

      <section className="allocation-register" aria-labelledby="allocation-heading">
        <h2 className="sr-only" id="allocation-heading">Asset allocation</h2>
        <div className="allocation-values">
          {summary.allocation.map((item) => (
            <div key={item.assetClass} style={{ width: `${Math.max(13, (Number(item.eurValue) / total) * 100)}%` }}>
              <span>{item.assetClass}</span><strong>{percent(item.eurValue, total)}</strong>
            </div>
          ))}
        </div>
        <div className="allocation-axis" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></div>
      </section>

      <section className="top-register" aria-labelledby="leaders-heading">
        <header><h2 id="leaders-heading">{summary.holdings.length} positions</h2><span>Value (EUR)</span><span>% of portfolio</span></header>
        <ol>
          {topHoldings.map((holding, index) => (
            <li key={`${holding.accountId}:${holding.instrumentId}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{holding.instrumentName}</strong>
              <span>{money(holding.eurValue)}</span>
              <span>{percent(holding.eurValue ?? 0, total)}</span>
            </li>
          ))}
        </ol>
        <a href="#holdings-heading">+{Math.max(0, summary.holdings.length - topHoldings.length)} more positions <i className="arrow-down" aria-hidden="true" /></a>
      </section>

      <nav className="fact-strip" aria-label="Portfolio facts and shortcuts">
        <a href="#holdings-heading"><span>All holdings</span><strong>View</strong><i className="arrow-right" aria-hidden="true" /></a>
        <a href="#history-heading"><span>History</span><strong>{valuedHistory.length >= 2 ? "View" : "Collecting"}</strong><i className="arrow-down" aria-hidden="true" /></a>
        <div><span>Base currency</span><strong>EUR</strong></div>
        <div><span>Prices as at</span><strong>{displayDate(observedOn)}</strong></div>
        <div><span>Valuation</span><strong>{summary.complete ? "Complete" : "Partial"}</strong></div>
        <div><span>Interface</span><strong>MCP read-only</strong></div>
      </nav>

      <section className="history-register" aria-labelledby="history-heading">
        <header><div><h2 id="history-heading">Portfolio history</h2><p>Monthly closing values by account · EUR</p></div><span>{valuedHistory.length >= 2 ? `${displayDate(valuedHistory[0].time)} — ${displayDate(valuedHistory.at(-1)?.time ?? valuedHistory[0].time)}` : `Begins ${displayDate(summary.valuationDate)}`}</span></header>
        {valuedHistory.length >= 2 ? (
          <PortfolioChart data={valuedHistory} colors={chartColors} />
        ) : (
          <div className="history-empty">
            <span>HISTORY / T+0</span>
            <strong>First complete valuation recorded.</strong>
            <p>Future complete snapshots will form the account-stacked series. Missing historical observations are never rendered as zero.</p>
          </div>
        )}
      </section>

      <section className="positions-register" aria-labelledby="holdings-heading">
        <header><div><h2 id="holdings-heading">All holdings</h2><p>{summary.holdings.length} positions · {summary.accountTotals.length} custodians · EUR reporting</p></div></header>
        <div className="desktop-table">
          <table>
            <thead><tr><th>Rank</th><th>Instrument</th><th className="number-cell">Quantity</th><th className="number-cell">Price</th><th className="number-cell">Native value</th><th className="number-cell">Value EUR</th><th>Data</th></tr></thead>
            <tbody>{summary.holdings.map((holding, index) => <RegisterRow holding={holding} rank={index + 1} key={`${holding.accountId}:${holding.instrumentId}`} />)}</tbody>
          </table>
        </div>
        <div className="mobile-positions">{summary.holdings.map((holding, index) => <MobileRegisterRow holding={holding} rank={index + 1} key={`${holding.accountId}:${holding.instrumentId}`} />)}</div>
      </section>

      {summary.missing.length ? (
        <section className="valuation-gaps" aria-labelledby="gaps-heading">
          <h2 id="gaps-heading">Valuation gaps</h2>
          <ul>{summary.missing.map((item, index) => <li key={`${item.kind}:${index}`}>{item.message}</li>)}</ul>
        </section>
      ) : null}
    </>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const session = await auth.api.getSession({ headers: await headers() });
  const params = await searchParams;
  if (!session) return <Login invalid={params.error === "invalid"} />;

  const environment = getEnvironment();
  const valuationDate = new Date().toISOString().slice(0, 10);
  const { summary, history } = await queryPortfolioDashboard(getDatabase(), valuationDate, {
    priceStaleAfterDays: environment.PRICE_STALE_AFTER_DAYS,
    fxStaleAfterDays: environment.FX_STALE_AFTER_DAYS,
  });
  const hasData = summary.accountTotals.length || summary.holdings.length || summary.cash.length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="topbar-brand">Eurofolio</Link>
        <nav aria-label="Portfolio navigation"><a href="#portfolio-heading" aria-current="page">Overview</a><a href="#holdings-heading">Holdings</a><a href="#history-heading">History</a></nav>
        <form action={logout}><button type="submit">Sign out</button></form>
      </header>
      <main className="quotation-sheet">
        <i className="crop-mark crop-ne" aria-hidden="true" />
        <i className="crop-mark crop-sw" aria-hidden="true" />
        {hasData ? <Dashboard summary={summary} history={history} /> : <EmptyDashboard />}
      </main>
      <footer><span>EUR / SINGLE OWNER / DELAYED MARKET DATA</span><span>Not investment advice</span></footer>
    </div>
  );
}
