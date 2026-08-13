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

const accountColors = ["#274c77", "#4f772d", "#a26736", "#6d597a", "#52796f"];
const allocationColors: Record<string, string> = {
  fund: "#274c77",
  etf: "#4f772d",
  stock: "#a26736",
  cash: "#8b95a1",
};

function money(value: string | null, currency = "EUR", compact = false): string {
  if (value === null) return "Not valued";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 1 : 2,
  }).format(Number(formatDecimal(value, 2)));
}

function number(value: string, maximumFractionDigits = 4): string {
  return new Intl.NumberFormat("en-IE", { maximumFractionDigits }).format(Number(value));
}

function percent(part: string | number, total: string | number): string {
  const denominator = Number(total);
  return denominator ? `${((Number(part) / denominator) * 100).toFixed(1)}%` : "0.0%";
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${value}T12:00:00Z`));
}

function freshnessLabel(value: string): string {
  return value === "manual" ? "Manual" : value[0].toUpperCase() + value.slice(1);
}

function latestObservation(summary: PortfolioSummary): string {
  const dates = [
    ...summary.holdings.map((holding) => holding.priceDate),
    ...summary.holdings.map((holding) => holding.fxDate),
    ...summary.cash.map((cash) => cash.fxDate),
  ].filter((date): date is string => Boolean(date));
  return dates.sort().at(-1) ?? summary.valuationDate;
}

function Login({ invalid }: { invalid: boolean }) {
  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-heading">
        <div className="login-brand"><span aria-hidden="true">€</span> Eurofolio</div>
        <h1 id="login-heading">Sign in</h1>
        <p className="lede">Your private, consolidated portfolio.</p>
        <form action={login} className="login-form">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" minLength={12} autoComplete="current-password" required />
          {invalid ? <p className="form-error" role="alert">That email or password was not accepted.</p> : null}
          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}

function EmptyDashboard() {
  return (
    <section className="empty-state">
      <h1>No portfolio data</h1>
      <p>Create an account and instrument through the Eurofolio MCP server, then record your first deposit or purchase.</p>
      <code>/mcp</code>
    </section>
  );
}

function PositionRow({ holding }: { holding: ValuedHolding }) {
  return (
    <tr>
      <td>
        <strong>{holding.instrumentName}</strong>
        <small>{holding.assetClass.toUpperCase()} · {holding.accountName}</small>
      </td>
      <td className="numeric">{number(holding.quantity)}</td>
      <td className="numeric">
        {holding.price ? money(holding.price, holding.nativeCurrency) : "—"}
        <small>{holding.priceDate ? displayDate(holding.priceDate) : "Price missing"}</small>
      </td>
      <td className="numeric">{money(holding.nativeValue, holding.nativeCurrency)}</td>
      <td className="numeric"><strong>{money(holding.eurValue)}</strong></td>
      <td>
        <span className={`data-state ${holding.priceFreshness}`}>{freshnessLabel(holding.priceFreshness)}</span>
        <small>{holding.priceProvider ?? "No source"}</small>
      </td>
    </tr>
  );
}

function MobilePosition({ holding }: { holding: ValuedHolding }) {
  return (
    <details className="mobile-position">
      <summary>
        <span><strong>{holding.instrumentName}</strong><small>{holding.accountName} · {holding.assetClass}</small></span>
        <span className="numeric"><strong>{money(holding.eurValue)}</strong><small>{number(holding.quantity)} units</small></span>
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
  const valuedHistory = history.filter((point) => point.complete);
  const topHoldings = summary.holdings
    .filter((holding) => holding.eurValue !== null)
    .toSorted((left, right) => Number(right.eurValue) - Number(left.eurValue))
    .slice(0, 5);
  const invested = summary.allocation
    .filter((item) => item.assetClass !== "cash")
    .reduce((sum, item) => sum + Number(item.eurValue), 0);
  const cash = summary.allocation.find((item) => item.assetClass === "cash")?.eurValue ?? "0";
  const observedOn = latestObservation(summary);

  return (
    <>
      <section className="overview" aria-labelledby="portfolio-heading">
        <div className="portfolio-summary">
          <div className="summary-heading">
            <div>
              <p className="section-label">Total portfolio</p>
              <h1 id="portfolio-heading">{money(summary.eurTotal)}</h1>
            </div>
            <span className={`valuation-state ${summary.complete ? "complete" : "partial"}`}>
              {summary.complete ? "Fully valued" : `${summary.missing.length} valuation gap${summary.missing.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="summary-metrics" aria-label="Portfolio statistics">
            <div><span>Invested</span><strong>{money(String(invested))}</strong></div>
            <div><span>Cash</span><strong>{money(cash)}</strong></div>
            <div><span>Positions</span><strong>{summary.holdings.length}</strong></div>
            <div><span>Data through</span><strong>{displayDate(observedOn)}</strong></div>
          </div>
        </div>

        <section className="account-summary" aria-labelledby="accounts-heading">
          <div className="panel-heading"><h2 id="accounts-heading">Accounts</h2><span>{summary.accountTotals.length}</span></div>
          <div className="account-list">
            {summary.accountTotals.map((account, index) => (
              <div className="account-row" key={account.accountId}>
                <span className="account-swatch" style={{ backgroundColor: accountColors[index % accountColors.length] }} aria-hidden="true" />
                <span className="account-name">{account.accountName}</span>
                <span className="account-share">{percent(account.eurValue, summary.eurTotal)}</span>
                <strong>{money(account.eurValue)}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="allocation-strip" aria-labelledby="allocation-heading">
        <div className="panel-heading"><h2 id="allocation-heading">Asset mix</h2><span>EUR reporting</span></div>
        <div className="allocation-bar" aria-hidden="true">
          {summary.allocation.map((item) => (
            <span key={item.assetClass} style={{ width: percent(item.eurValue, total), backgroundColor: allocationColors[item.assetClass] ?? "#6d597a" }} />
          ))}
        </div>
        <div className="allocation-legend">
          {summary.allocation.map((item) => (
            <div key={item.assetClass}>
              <span className="allocation-dot" style={{ backgroundColor: allocationColors[item.assetClass] ?? "#6d597a" }} />
              <span>{item.assetClass}</span><strong>{percent(item.eurValue, total)}</strong><small>{money(item.eurValue)}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="market-grid">
        <section className="history-panel" aria-labelledby="history-heading">
          <div className="panel-heading chart-heading">
            <div><h2 id="history-heading">Value by account</h2><p>Monthly closing values · EUR</p></div>
            <span>{valuedHistory.length ? `${displayDate(valuedHistory[0].time)} – ${displayDate(valuedHistory.at(-1)?.time ?? valuedHistory[0].time)}` : "Collecting history"}</span>
          </div>
          {valuedHistory.length >= 2 ? (
            <PortfolioChart data={valuedHistory} colors={accountColors} />
          ) : (
            <div className="history-pending">
              <div className="pending-line" aria-hidden="true" />
              <strong>History starts with this valuation</strong>
              <p>Future complete snapshots will build an account-stacked chart here. Incomplete historical prices are excluded instead of shown as zero.</p>
            </div>
          )}
        </section>

        <section className="leaders-panel" aria-labelledby="leaders-heading">
          <div className="panel-heading"><h2 id="leaders-heading">Largest positions</h2><a href="#holdings-heading">View all</a></div>
          <ol className="leader-list">
            {topHoldings.map((holding) => (
              <li key={`${holding.accountId}:${holding.instrumentId}`}>
                <div><strong>{holding.instrumentName}</strong><small>{holding.accountName}</small></div>
                <div className="numeric"><strong>{money(holding.eurValue)}</strong><small>{percent(holding.eurValue ?? 0, total)}</small></div>
              </li>
            ))}
          </ol>
        </section>
      </section>

      <section className="positions-section" aria-labelledby="holdings-heading">
        <div className="section-title"><div><h2 id="holdings-heading">Positions</h2><p>{summary.holdings.length} holdings across {summary.accountTotals.length} accounts</p></div></div>
        <div className="desktop-table">
          <table>
            <thead><tr><th>Instrument</th><th className="numeric">Quantity</th><th className="numeric">Price</th><th className="numeric">Native value</th><th className="numeric">Value EUR</th><th>Data</th></tr></thead>
            <tbody>{summary.holdings.map((holding) => <PositionRow holding={holding} key={`${holding.accountId}:${holding.instrumentId}`} />)}</tbody>
          </table>
        </div>
        <div className="mobile-positions">{summary.holdings.map((holding) => <MobilePosition holding={holding} key={`${holding.accountId}:${holding.instrumentId}`} />)}</div>
      </section>

      {summary.missing.length ? (
        <section className="warning-panel" aria-labelledby="gaps-heading">
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
        <Link href="/" className="brand"><span aria-hidden="true">€</span> Eurofolio</Link>
        <nav aria-label="Portfolio navigation">
          <a href="#portfolio-heading" aria-current="page">Overview</a>
          <a href="#holdings-heading">Positions</a>
          <a href="#accounts-heading">Accounts</a>
        </nav>
        <form action={logout}><button type="submit" className="text-button">Sign out</button></form>
      </header>
      <main className="dashboard">{hasData ? <Dashboard summary={summary} history={history} /> : <EmptyDashboard />}</main>
      <nav className="mobile-nav" aria-label="Mobile portfolio navigation">
        <a href="#portfolio-heading" aria-current="page">Overview</a><a href="#holdings-heading">Positions</a><a href="#accounts-heading">Accounts</a>
      </nav>
      <footer><span>EUR master currency</span><span>Delayed market data · Not investment advice</span></footer>
    </div>
  );
}
