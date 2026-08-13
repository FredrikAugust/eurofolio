import { headers } from "next/headers";
import Link from "next/link";

import { login } from "@/app/actions";
import { AppFrame } from "@/app/app-frame";
import { displayDate, freshnessLabel, money, percent, priceSourceLabel, quantity } from "@/app/format";
import { PortfolioBackdrop } from "@/app/portfolio-backdrop";
import { PortfolioChart } from "@/app/portfolio-chart";
import { Sparkline } from "@/app/sparkline";
import { auth } from "@/server/better-auth";
import { getDatabase } from "@/server/db/client";
import { getEnvironment } from "@/server/env";
import {
  queryPortfolioDashboard,
  type InstrumentPriceHistory,
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
            <button type="submit">Sign in</button>
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

function RegisterRow({ holding, rank, trend }: { holding: ValuedHolding; rank: number; trend: InstrumentPriceHistory["points"] }) {
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
      <td className="trend-cell"><Sparkline points={trend} label={`${holding.instrumentName} price trend`} /></td>
      <td>
        <span className={`source-state ${holding.priceFreshness}`}>{freshnessLabel(holding.priceFreshness)}</span>
        <small>{priceSourceLabel(holding.priceProvider, holding.priceFreshness)}</small>
      </td>
    </tr>
  );
}

function MobileRegisterRow({ holding, rank, trend }: { holding: ValuedHolding; rank: number; trend: InstrumentPriceHistory["points"] }) {
  return (
    <details className="mobile-position">
      <summary>
        <span className="mobile-rank">{String(rank).padStart(2, "0")}</span>
        <span className="mobile-name"><strong>{holding.instrumentName}</strong><small>{holding.accountName} · {holding.assetClass}</small></span>
        <span className="number-cell"><strong>{money(holding.eurValue)}</strong><small>{quantity(holding.quantity)} units</small></span>
        <Sparkline points={trend} label={`${holding.instrumentName} price trend`} className="mobile-sparkline" />
      </summary>
      <dl>
        <div><dt>Price</dt><dd>{holding.price ? money(holding.price, holding.nativeCurrency) : "Missing"}</dd></div>
        <div><dt>Native value</dt><dd>{money(holding.nativeValue, holding.nativeCurrency)}</dd></div>
        <div><dt>Observation</dt><dd>{holding.priceDate ? displayDate(holding.priceDate) : "Missing"}</dd></div>
        <div><dt>Source</dt><dd>{priceSourceLabel(holding.priceProvider, holding.priceFreshness)} · {freshnessLabel(holding.priceFreshness)}</dd></div>
      </dl>
    </details>
  );
}

function Dashboard({ summary, history, priceHistory }: { summary: PortfolioSummary; history: PortfolioHistoryPoint[]; priceHistory: InstrumentPriceHistory[] }) {
  const total = Number(summary.eurTotal) || 1;
  const observedOn = latestObservation(summary);
  const observedParts = displayDate(observedOn, true) as string[];
  const valuedHistory = history.filter((point) => point.complete);
  const topHoldings = summary.holdings.filter((holding) => holding.eurValue !== null).slice(0, 3);
  const priceHistoryMap = new Map(priceHistory.map((series) => [series.instrumentId, series.points]));
  const accountHistory = new Map(summary.accountTotals.map((account) => [account.accountId, history.flatMap((point) => {
    const value = point.accounts.find((candidate) => candidate.accountId === account.accountId)?.value;
    return point.complete && value !== null && value !== undefined ? [{ time: point.time, value }] : [];
  })]));

  return (
    <>
      <div className="measure-axis" aria-hidden="true">
        <span>WIDTH</span><span>75</span><i /><span>100</span><span>125</span><span>150</span>
      </div>

      <section className="value-field" aria-labelledby="portfolio-heading">
        <div className="weight-axis" aria-hidden="true"><span>WGT</span><b>900</b><i>700</i></div>
        <div className="value-lockup">
          <PortfolioBackdrop points={history} />
          <div className="value-copy">
            <span className="wordmark">Eurofolio</span>
            <h1 id="portfolio-heading">{money(summary.eurTotal)}</h1>
          </div>
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
            <Sparkline points={accountHistory.get(account.accountId) ?? []} label={`${account.accountName} account value`} color="currentColor" />
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
        <header><h2 id="leaders-heading">{summary.holdings.length} positions</h2><span>Trend</span><span>Value (EUR)</span><span>% of portfolio</span></header>
        <ol>
          {topHoldings.map((holding, index) => (
            <li key={`${holding.accountId}:${holding.instrumentId}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{holding.instrumentName}</strong>
              <Sparkline points={priceHistoryMap.get(holding.instrumentId) ?? []} label={`${holding.instrumentName} price trend`} />
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
            <thead><tr><th>Rank</th><th>Instrument</th><th className="number-cell">Quantity</th><th className="number-cell">Price</th><th className="number-cell">Native value</th><th className="number-cell">Value EUR</th><th>Trend</th><th>Data</th></tr></thead>
            <tbody>{summary.holdings.map((holding, index) => <RegisterRow holding={holding} rank={index + 1} trend={priceHistoryMap.get(holding.instrumentId) ?? []} key={`${holding.accountId}:${holding.instrumentId}`} />)}</tbody>
          </table>
        </div>
        <div className="mobile-positions">{summary.holdings.map((holding, index) => <MobileRegisterRow holding={holding} rank={index + 1} trend={priceHistoryMap.get(holding.instrumentId) ?? []} key={`${holding.accountId}:${holding.instrumentId}`} />)}</div>
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
  const { summary, history, priceHistory } = await queryPortfolioDashboard(getDatabase(), valuationDate, {
    priceStaleAfterDays: environment.PRICE_STALE_AFTER_DAYS,
    fxStaleAfterDays: environment.FX_STALE_AFTER_DAYS,
  });
  const hasData = summary.accountTotals.length || summary.holdings.length || summary.cash.length;

  return <AppFrame current="Overview">{hasData ? <Dashboard summary={summary} history={history} priceHistory={priceHistory} /> : <EmptyDashboard />}</AppFrame>;
}
