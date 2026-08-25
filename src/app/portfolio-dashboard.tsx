"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { displayDate, freshnessLabel, money, percent, priceSourceLabel, quantity } from "@/app/format";
import { PortfolioChart } from "@/app/portfolio-chart";
import { percentageChange, pointsInRange, portfolioRanges, type PortfolioRange } from "@/app/portfolio-period";
import type {
  InstrumentPriceHistory,
  PortfolioPeriodChange,
  PortfolioSummary,
  ValuedHolding,
} from "@/server/services/portfolio-query";

function assetClassLabel(assetClass: string): string {
  return assetClass.toLowerCase() === "etf"
    ? "ETF"
    : assetClass.charAt(0).toUpperCase() + assetClass.slice(1).toLowerCase();
}

function observationWindow(summary: PortfolioSummary): { first: string; last: string } {
  const dates = [
    ...summary.holdings.map((holding) => holding.priceDate),
    ...summary.holdings.map((holding) => holding.fxDate),
    ...summary.cash.map((cash) => cash.fxDate),
  ]
    .filter((date): date is string => Boolean(date))
    .sort();
  return {
    first: dates.at(0) ?? summary.valuationDate,
    last: dates.at(-1) ?? summary.valuationDate,
  };
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
  trend: InstrumentPriceHistory["points"];
  total: number;
  range: PortfolioRange;
};

function HoldingPosition({ holding, trend, total, range }: HoldingRowProps) {
  const change = priceChange(trend);
  return (
    <details className="holding-position">
      <summary>
        <span className="holding-identity">
          <strong>{holding.instrumentName}</strong>
          <small>{holding.accountName} · {assetClassLabel(holding.assetClass)}</small>
        </span>
        <span className="holding-value"><strong>{money(holding.eurValue)}</strong><small>Value</small></span>
        <span className="holding-weight"><strong>{percent(holding.eurValue ?? 0, total)}</strong><small>Of portfolio</small></span>
        <span className={`holding-change ${change.direction}`}><strong>{change.label}</strong><small>{range} price move</small></span>
      </summary>
      <dl className="holding-facts">
        <div><dt>Quantity</dt><dd>{quantity(holding.quantity)}</dd></div>
        <div><dt>Price</dt><dd>{holding.price ? money(holding.price, holding.nativeCurrency) : "Missing"}</dd></div>
        <div><dt>Native value</dt><dd>{money(holding.nativeValue, holding.nativeCurrency)}</dd></div>
        <div><dt>Price observed</dt><dd>{holding.priceDate ? displayDate(holding.priceDate) : "Missing"}</dd></div>
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
  const rangeIndex = portfolioRanges.indexOf(range);
  const rangeProgress = rangeIndex / (portfolioRanges.length - 1);
  const total = Number(summary.eurTotal) || 1;
  const observed = observationWindow(summary);
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
      <section className="portfolio-overview" aria-labelledby="portfolio-heading">
        <header className="portfolio-summary">
          <div className="hero-value">
            <h1 id="portfolio-heading">{money(summary.eurTotal)}</h1>
            <p>Total portfolio value · {displayDate(summary.valuationDate)}</p>
            <div className={`valuation-status ${summary.complete ? "complete" : "partial"}`}>
              <span>{summary.complete ? "Complete valuation" : "Partial valuation"}</span>
              <span>Market data {displayDate(observed.first)}{observed.first === observed.last ? "" : ` to ${displayDate(observed.last)}`}</span>
              {!summary.complete ? <a href="#valuation-gaps">Review gaps</a> : null}
            </div>
          </div>
          <div className="hero-periods">
            <div
              className="time-lens"
              style={{ "--range-progress": `${rangeProgress * 100}%` } as CSSProperties}
            >
              <div className="time-lens-heading">
                <label htmlFor="portfolio-time-range">Time range</label>
                <span aria-hidden="true">Drag to zoom</span>
              </div>
              <div className="time-lens-control">
                <output className="time-lens-output" htmlFor="portfolio-time-range">{range}</output>
                <input
                  id="portfolio-time-range"
                  type="range"
                  min={0}
                  max={portfolioRanges.length - 1}
                  step={1}
                  value={rangeIndex}
                  aria-valuetext={range === "ALL" ? "All history" : range}
                  onChange={(event) => setRange(portfolioRanges[Number(event.currentTarget.value)] ?? range)}
                />
                <div className="time-lens-ticks" aria-hidden="true">
                  {portfolioRanges.map((option) => (
                    <span className={range === option ? "selected" : undefined} key={option}>{option}</span>
                  ))}
                </div>
              </div>
              <div className="time-lens-caption" aria-hidden="true"><span>Detailed</span><span>Long-term</span></div>
            </div>
            <div className={`selected-change ${changeDirection}`} aria-live="polite">
              <span>{range} balance change</span>
              <strong>{signedMoney(selectedChange?.amount ?? null)}</strong>
              <small>{signedPercent(selectedChange?.percent ?? null)}{exactStart ? ` since ${displayDate(exactStart)}` : ""}</small>
            </div>
            <p className="change-explainer">Includes deposits, withdrawals, dividends, and fees. Not investment return.</p>
          </div>
        </header>

        <div className="history-register" aria-labelledby="history-heading">
          <header><div><h2 id="history-heading">Balance history</h2><p>EUR · {range}</p></div></header>
          {valuedHistory.length >= 2 ? (
            <PortfolioChart data={valuedHistory} range={range} />
          ) : (
            <div className="history-empty">
              <strong>Not enough history for {range}.</strong>
              <p>Choose a longer period or add market observations through the refresh process.</p>
            </div>
          )}
        </div>
      </section>

      <section className="positions-register" aria-labelledby="holdings-heading">
        <header><div><h2 id="holdings-heading">Holdings</h2><p>Largest positions first · price movement follows {range}</p></div><span>{summary.holdings.length} positions</span></header>
        <div className="holdings-columns" aria-hidden="true">
          <span>Holding</span><span>Value</span><span>Share</span><span>{range} price move</span><span />
        </div>
        <div className="holdings-list">{summary.holdings.map((holding) => <HoldingPosition holding={holding} trend={priceHistoryMap.get(holding.instrumentId) ?? []} total={total} range={range} key={`${holding.accountId}:${holding.instrumentId}`} />)}</div>
      </section>

      <section className="portfolio-breakdown" aria-labelledby="breakdown-heading">
        <header><h2 id="breakdown-heading">Where your money sits</h2><p>Supporting view of accounts and asset mix.</p></header>
        <div className="breakdown-group">
          <h3>Accounts</h3>
          {[...summary.accountTotals].sort((left, right) => Number(right.eurValue) - Number(left.eurValue)).map((account) => <p key={account.accountId}><span>{account.accountName}</span><strong>{money(account.eurValue)}</strong><small>{percent(account.eurValue, total)}</small><i aria-hidden="true" style={{ width: `${Math.min(100, Math.max(2, (Number(account.eurValue) / total) * 100))}%` }} /></p>)}
        </div>
        <div className="breakdown-group">
          <h3>Asset mix</h3>
          {[...summary.allocation].sort((left, right) => Number(right.eurValue) - Number(left.eurValue)).map((item) => <p key={item.assetClass}><span>{assetClassLabel(item.assetClass)}</span><strong>{money(item.eurValue)}</strong><small>{percent(item.eurValue, total)}</small><i aria-hidden="true" style={{ width: `${Math.min(100, Math.max(2, (Number(item.eurValue) / total) * 100))}%` }} /></p>)}
        </div>
      </section>

      {summary.missing.length ? (
        <section className="valuation-gaps" id="valuation-gaps" aria-labelledby="gaps-heading">
          <h2 id="gaps-heading">Valuation Gaps</h2>
          <ul>{summary.missing.map((item, index) => <li key={`${item.kind}:${index}`}>{item.message}</li>)}</ul>
        </section>
      ) : null}
    </>
  );
}
