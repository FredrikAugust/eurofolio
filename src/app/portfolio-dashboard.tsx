"use client";

import { useMemo, useState } from "react";

import { displayDate, freshnessLabel, money, percent, priceSourceLabel, quantity } from "@/app/format";
import { PortfolioChart } from "@/app/portfolio-chart";
import { percentageChange, pointsInRange, portfolioRanges, type PortfolioRange } from "@/app/portfolio-period";
import { Sparkline } from "@/app/sparkline";
import type {
  InstrumentPriceHistory,
  PortfolioPeriodChange,
  PortfolioSummary,
  ValuedHolding,
} from "@/server/services/portfolio-query";

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

function signedMoney(value: string | null): string {
  if (value === null) return "—";
  return `${Number(value) > 0 ? "+" : ""}${money(value)}`;
}

function signedPercent(value: string | null): string {
  if (value === null) return "Not enough history";
  const numeric = Number(value);
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function priceChange(points: InstrumentPriceHistory["points"]): { label: string; direction: string } {
  const change = percentageChange(points);
  if (change === null) return { label: "—", direction: "flat" };
  return {
    label: `${change > 0 ? "+" : ""}${change.toFixed(2)}%`,
    direction: change === 0 ? "flat" : change > 0 ? "positive" : "negative",
  };
}

type HoldingRowProps = {
  holding: ValuedHolding;
  rank: number;
  trend: InstrumentPriceHistory["points"];
  total: number;
  range: PortfolioRange;
};

function RegisterRow({ holding, rank, trend, total, range }: HoldingRowProps) {
  const change = priceChange(trend);
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
      <td className={`change-cell ${change.direction}`}><strong>{change.label}</strong><small>{range} price</small></td>
      <td className="trend-cell"><Sparkline points={trend} label={`${holding.instrumentName} ${range} price trend`} /></td>
    </tr>
  );
}

function MobileRegisterRow({ holding, rank, trend, range }: Omit<HoldingRowProps, "total">) {
  const change = priceChange(trend);
  return (
    <details className="mobile-position">
      <summary>
        <span className="mobile-rank">{String(rank).padStart(2, "0")}</span>
        <span className="mobile-name"><strong>{holding.instrumentName}</strong><small>{holding.accountName} · {assetClassLabel(holding.assetClass)}</small></span>
        <span className="number-cell"><strong>{money(holding.eurValue)}</strong><small className={change.direction}>{change.label} · {range}</small></span>
        <Sparkline points={trend} label={`${holding.instrumentName} ${range} price trend`} className="mobile-sparkline" />
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

type Props = {
  summary: PortfolioSummary;
  history: { time: string; value: number; complete: boolean }[];
  priceHistory: InstrumentPriceHistory[];
  periodChanges: PortfolioPeriodChange[];
};

export function PortfolioDashboard({ summary, history, priceHistory, periodChanges }: Props) {
  const [range, setRange] = useState<PortfolioRange>("1M");
  const total = Number(summary.eurTotal) || 1;
  const observedOn = latestObservation(summary);
  const selectedChange = periodChanges.find((period) => period.label === range) ?? periodChanges[0];
  const exactStart = selectedChange?.from;
  const valuedHistory = useMemo(
    () => pointsInRange(history.filter((point) => point.complete), range, exactStart),
    [exactStart, history, range],
  );
  const priceHistoryMap = useMemo(() => new Map(priceHistory.map((series) => [
    series.instrumentId,
    pointsInRange(series.points, range, exactStart),
  ])), [exactStart, priceHistory, range]);
  const changeDirection = selectedChange?.amount === null || Number(selectedChange?.amount ?? 0) === 0
    ? "flat"
    : Number(selectedChange?.amount) > 0 ? "positive" : "negative";

  return (
    <>
      <section className="portfolio-hero" aria-labelledby="portfolio-heading">
        <div className="hero-value">
          <h1 id="portfolio-heading">{money(summary.eurTotal)}</h1>
          <p>{summary.complete ? "Complete valuation" : "Partial valuation"} · Prices through {displayDate(observedOn)}</p>
        </div>
        <div className="hero-periods">
          <div className="page-ranges" aria-label="Portfolio period">
            {portfolioRanges.map((option) => (
              <button type="button" aria-pressed={range === option} onClick={() => setRange(option)} key={option}>{option}</button>
            ))}
          </div>
          <div className={`selected-change ${changeDirection}`} aria-live="polite">
            <span>{range} balance change</span>
            <strong>{signedMoney(selectedChange?.amount ?? null)}</strong>
            <small>{signedPercent(selectedChange?.percent ?? null)}{exactStart ? ` since ${displayDate(exactStart)}` : ""}</small>
          </div>
        </div>
      </section>

      <section className="history-register" aria-labelledby="history-heading">
        <header><div><h2 id="history-heading">Portfolio Balance</h2><p>Total balance · EUR · {range}</p></div></header>
        {valuedHistory.length >= 2 ? (
          <PortfolioChart data={valuedHistory} range={range} />
        ) : (
          <div className="history-empty">
            <strong>Not enough history for {range}.</strong>
            <p>Choose a longer period or add market observations through the refresh process.</p>
          </div>
        )}
      </section>

      <section className="positions-register" aria-labelledby="holdings-heading">
        <header><div><h2 id="holdings-heading">Holdings</h2><p>{summary.holdings.length} positions · changes follow {range}</p></div></header>
        <div className="desktop-table">
          <table>
            <thead><tr><th>Rank</th><th>Instrument</th><th className="number-cell">Quantity</th><th className="number-cell">Price</th><th className="number-cell">Value EUR</th><th className="number-cell">Weight</th><th className="number-cell">{range} change</th><th>Price trace</th></tr></thead>
            <tbody>{summary.holdings.map((holding, index) => <RegisterRow holding={holding} rank={index + 1} trend={priceHistoryMap.get(holding.instrumentId) ?? []} total={total} range={range} key={`${holding.accountId}:${holding.instrumentId}`} />)}</tbody>
          </table>
        </div>
        <div className="mobile-positions">{summary.holdings.map((holding, index) => <MobileRegisterRow holding={holding} rank={index + 1} trend={priceHistoryMap.get(holding.instrumentId) ?? []} range={range} key={`${holding.accountId}:${holding.instrumentId}`} />)}</div>
      </section>

      <section className="portfolio-breakdown" aria-label="Supporting portfolio breakdown">
        <div>
          <h2>Accounts</h2>
          {summary.accountTotals.map((account) => <p key={account.accountId}><span>{account.accountName}</span><strong>{money(account.eurValue)}</strong><small>{percent(account.eurValue, total)}</small></p>)}
        </div>
        <div>
          <h2>Allocation</h2>
          {summary.allocation.map((item) => <p key={item.assetClass}><span>{assetClassLabel(item.assetClass)}</span><strong>{percent(item.eurValue, total)}</strong><i aria-hidden="true" style={{ color: allocationColors[item.assetClass.toLowerCase()] ?? "#0c0c0d", width: `${Math.min(100, Math.max(2, (Number(item.eurValue) / total) * 100))}%` }} /></p>)}
        </div>
      </section>

      {summary.missing.length ? (
        <section className="valuation-gaps" aria-labelledby="gaps-heading">
          <h2 id="gaps-heading">Valuation Gaps</h2>
          <ul>{summary.missing.map((item, index) => <li key={`${item.kind}:${index}`}>{item.message}</li>)}</ul>
        </section>
      ) : null}
    </>
  );
}
