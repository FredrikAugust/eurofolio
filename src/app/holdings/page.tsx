import { AppFrame, PageHeading } from "@/app/app-frame";
import { displayDate, freshnessLabel, money, percent, priceSourceLabel, quantity } from "@/app/format";
import { requireOwner } from "@/app/require-owner";
import { Sparkline } from "@/app/sparkline";
import { getDatabase } from "@/server/db/client";
import { getEnvironment } from "@/server/env";
import { queryPortfolioDashboard } from "@/server/services/portfolio-query";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  await requireOwner();
  const valuationDate = new Date().toISOString().slice(0, 10);
  const environment = getEnvironment();
  const { summary, priceHistory } = await queryPortfolioDashboard(getDatabase(), valuationDate, {
    priceStaleAfterDays: environment.PRICE_STALE_AFTER_DAYS,
    fxStaleAfterDays: environment.FX_STALE_AFTER_DAYS,
  });
  const trends = new Map(priceHistory.map((series) => [series.instrumentId, series.points]));
  return (
    <AppFrame current="Holdings">
      <PageHeading title="Holdings" facts={[
        { label: "Positions", value: String(summary.holdings.length) },
        { label: "Value EUR", value: money(summary.eurTotal) },
        { label: "As at", value: displayDate(summary.valuationDate) as string },
      ]} />
      <section className="page-register" aria-labelledby="holdings-page-heading">
        <h2 className="sr-only" id="holdings-page-heading">Portfolio positions</h2>
        <div className="desktop-table">
          <table>
            <thead><tr><th>Rank</th><th>Instrument</th><th>Account</th><th className="number-cell">Quantity</th><th className="number-cell">Price</th><th className="number-cell">Value EUR</th><th>Trend / return</th><th className="number-cell">Share</th><th>Data</th></tr></thead>
            <tbody>{summary.holdings.map((holding, index) => (
              <tr key={`${holding.accountId}:${holding.instrumentId}`}>
                <td className="rank-cell">{String(index + 1).padStart(2, "0")}</td>
                <td><strong>{holding.instrumentName}</strong><small>{holding.assetClass} · {holding.nativeCurrency}</small></td>
                <td>{holding.accountName}</td>
                <td className="number-cell">{quantity(holding.quantity)}</td>
                <td className="number-cell">{holding.price ? money(holding.price, holding.nativeCurrency) : "—"}<small>{holding.priceDate ? displayDate(holding.priceDate) : "Missing"}</small></td>
                <td className="number-cell"><strong>{money(holding.eurValue)}</strong></td>
                <td className="trend-cell"><Sparkline points={trends.get(holding.instrumentId) ?? []} label={`${holding.instrumentName} price trend`} /></td>
                <td className="number-cell">{percent(holding.eurValue ?? 0, summary.eurTotal)}</td>
                <td><span className={`source-state ${holding.priceFreshness}`}>{freshnessLabel(holding.priceFreshness)}</span><small>{priceSourceLabel(holding.priceProvider, holding.priceFreshness)}</small></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="mobile-positions">
          {summary.holdings.map((holding, index) => (
            <details className="mobile-position" key={`${holding.accountId}:${holding.instrumentId}`}>
              <summary>
                <span className="mobile-rank">{String(index + 1).padStart(2, "0")}</span>
                <span className="mobile-name"><strong>{holding.instrumentName}</strong><small>{holding.accountName} · {holding.assetClass}</small></span>
                <span className="number-cell"><strong>{money(holding.eurValue)}</strong><small>{percent(holding.eurValue ?? 0, summary.eurTotal)}</small></span>
                <Sparkline points={trends.get(holding.instrumentId) ?? []} label={`${holding.instrumentName} price trend`} className="mobile-sparkline" />
              </summary>
              <dl>
                <div><dt>Quantity</dt><dd>{quantity(holding.quantity)}</dd></div>
                <div><dt>Price</dt><dd>{holding.price ? money(holding.price, holding.nativeCurrency) : "Missing"}</dd></div>
                <div><dt>Observation</dt><dd>{holding.priceDate ? displayDate(holding.priceDate) : "Missing"}</dd></div>
                <div><dt>Source</dt><dd>{priceSourceLabel(holding.priceProvider, holding.priceFreshness)} · {freshnessLabel(holding.priceFreshness)}</dd></div>
              </dl>
            </details>
          ))}
        </div>
      </section>
    </AppFrame>
  );
}
