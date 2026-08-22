import { connection } from "next/server";
import { Suspense } from "react";

import { displayDate, freshnessLabel, money, percent, priceSourceLabel, quantity } from "@/app/format";
import { PortfolioChart } from "@/app/portfolio-chart";
import { OverviewPending } from "@/app/route-pending";
import { Sparkline } from "@/app/sparkline";
import { getCachedPortfolioDashboard } from "@/server/services/cached-queries";
import {
  type InstrumentPriceHistory,
  type PortfolioHistoryPoint,
  type PortfolioPeriodChange,
  type PortfolioSummary,
  type ValuedHolding,
} from "@/server/services/portfolio-query";

const chartColors = ["#f04d23", "#1748ba", "#0c0c0d", "#657080"];
const allocationColors: Record<string, string> = {
  stock: "#f04d23",
  fund: "#1748ba",
  etf: "#0c0c0d",
  cash: "#676763",
};

function assetClassLabel(assetClass: string): string {
  return assetClass.toLowerCase() === "etf"
    ? "ETF"
    : assetClass.charAt(0).toUpperCase() + assetClass.slice(1).toLowerCase();
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

function EmptyDashboard() {
  return (
    <section className="empty-sheet">
      <h1>No portfolio data</h1>
      <p>Create the first account and position through Eurofolio MCP.</p>
      <code>/mcp</code>
    </section>
  );
}

function RegisterRow({ holding, rank, trend, total }: { holding: ValuedHolding; rank: number; trend: InstrumentPriceHistory["points"]; total: number }) {
  return (
    <tr>
      <td className="rank-cell">{String(rank).padStart(2, "0")}</td>
      <td>
        <strong>{holding.instrumentName}</strong>
        <small>{holding.accountName} · {assetClassLabel(holding.assetClass)} · {freshnessLabel(holding.priceFreshness)}</small>
      </td>
      <td className="number-cell">{quantity(holding.quantity)}</td>
      <td className="number-cell">
        {holding.price ? money(holding.price, holding.nativeCurrency) : "—"}
        <small>{holding.priceDate ? displayDate(holding.priceDate) : "Price missing"}</small>
      </td>
      <td className="number-cell"><strong>{money(holding.eurValue)}</strong></td>
      <td className="number-cell">{percent(holding.eurValue ?? 0, total)}</td>
      <td className="trend-cell"><Sparkline points={trend} label={`${holding.instrumentName} price trend`} /></td>
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

function signedMoney(value: string | null): string {
  if (value === null) return "—";
  return `${Number(value) > 0 ? "+" : ""}${money(value)}`;
}

function signedPercent(value: string | null): string {
  if (value === null) return "Not enough history";
  const numeric = Number(value);
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function Dashboard({ summary, history, priceHistory, periodChanges }: { summary: PortfolioSummary; history: PortfolioHistoryPoint[]; priceHistory: InstrumentPriceHistory[]; periodChanges: PortfolioPeriodChange[] }) {
  const total = Number(summary.eurTotal) || 1;
  const observedOn = latestObservation(summary);
  const valuedHistory = history.filter((point) => point.complete);
  const priceHistoryMap = new Map(priceHistory.map((series) => [series.instrumentId, series.points]));

  return (
    <>
      <section className="portfolio-hero" aria-labelledby="portfolio-heading">
        <div className="hero-value">
          <span>Portfolio value</span>
          <h1 id="portfolio-heading">{money(summary.eurTotal)}</h1>
          <p>{summary.complete ? "Complete valuation" : "Partial valuation"} · Prices through {displayDate(observedOn)}</p>
        </div>
        <div className="hero-periods" aria-label={`Portfolio value changes as at ${displayDate(observedOn)}`}>
          <div className="period-changes" aria-label={`Portfolio changes as at ${displayDate(observedOn)}`}>
            {periodChanges.map((period) => {
              const numeric = Number(period.amount ?? 0);
              const direction = period.amount === null || numeric === 0 ? "flat" : numeric > 0 ? "positive" : "negative";
              return (
                <div className={`period-change ${direction}`} key={period.label}>
                  <span>{period.label}</span>
                  <strong>{signedMoney(period.amount)}</strong>
                  <small>{signedPercent(period.percent)}</small>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="history-register" aria-labelledby="history-heading">
        <header><div><h2 id="history-heading">Performance</h2><p>Portfolio value by account · EUR</p></div></header>
        {valuedHistory.length >= 2 ? (
          <PortfolioChart data={valuedHistory} colors={chartColors} />
        ) : (
          <div className="history-empty">
            <span>HISTORY / T+0</span>
            <strong>First complete valuation recorded.</strong>
            <p>Trade dates already reconstruct quantities. The stacked total begins when every held instrument also has a price and FX observation for the same month.</p>
          </div>
        )}
      </section>

      <section className="portfolio-breakdown" aria-label="Portfolio breakdown">
        <div>
          <h2>Accounts</h2>
          {summary.accountTotals.map((account) => <p key={account.accountId}><span>{account.accountName}</span><strong>{money(account.eurValue)}</strong><small>{percent(account.eurValue, total)}</small></p>)}
        </div>
        <div>
          <h2>Allocation</h2>
          {summary.allocation.map((item) => <p key={item.assetClass}><span>{assetClassLabel(item.assetClass)}</span><strong>{percent(item.eurValue, total)}</strong><i style={{ color: allocationColors[item.assetClass.toLowerCase()] ?? "#0c0c0d", width: `${Math.min(100, Math.max(2, (Number(item.eurValue) / total) * 100))}%` }} /></p>)}
        </div>
      </section>

      <section className="positions-register" aria-labelledby="holdings-heading">
        <header><div><h2 id="holdings-heading">Holdings</h2><p>{summary.holdings.length} positions across {summary.accountTotals.length} accounts</p></div></header>
        <div className="desktop-table">
          <table>
            <thead><tr><th>Rank</th><th>Instrument</th><th className="number-cell">Quantity</th><th className="number-cell">Price</th><th className="number-cell">Value EUR</th><th className="number-cell">Weight</th><th>Recent</th></tr></thead>
            <tbody>{summary.holdings.map((holding, index) => <RegisterRow holding={holding} rank={index + 1} trend={priceHistoryMap.get(holding.instrumentId) ?? []} total={total} key={`${holding.accountId}:${holding.instrumentId}`} />)}</tbody>
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

export default function Home() {
  return (
    <Suspense fallback={<OverviewPending />}>
      <PortfolioHome />
    </Suspense>
  );
}

async function PortfolioHome() {
  await connection();
  const valuationDate = new Date().toISOString().slice(0, 10);
  const { summary, history, priceHistory, periodChanges } = await getCachedPortfolioDashboard(valuationDate);
  const hasData = summary.accountTotals.length || summary.holdings.length || summary.cash.length;

  return hasData ? <Dashboard summary={summary} history={history} priceHistory={priceHistory} periodChanges={periodChanges} /> : <EmptyDashboard />;
}
