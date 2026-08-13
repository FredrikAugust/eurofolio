import { AppFrame, PageHeading } from "@/app/app-frame";
import { displayDate, money } from "@/app/format";
import { requireOwner } from "@/app/require-owner";
import { getDatabase } from "@/server/db/client";
import { queryDataRegister } from "@/server/services/read-pages";

export const dynamic = "force-dynamic";

export default async function DataPage() {
  await requireOwner();
  const { instrumentRows, priceRows, rateRows, runRows } = await queryDataRegister(getDatabase());
  const latestPrices = new Map<string, (typeof priceRows)[number]>();
  priceRows.forEach((row) => { if (!latestPrices.has(row.instrumentId)) latestPrices.set(row.instrumentId, row); });
  const latestRates = new Map<string, (typeof rateRows)[number]>();
  rateRows.forEach((row) => { if (!latestRates.has(row.quoteCurrency)) latestRates.set(row.quoteCurrency, row); });
  const latestRun = runRows[0];
  return (
    <AppFrame current="Data">
      <PageHeading title="Data" facts={[
        { label: "Instruments", value: String(instrumentRows.length) },
        { label: "Price observations", value: String(priceRows.length) },
        { label: "Last refresh", value: latestRun ? new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(latestRun.startedAt)) : "Never" },
      ]} />
      <section className="data-status" aria-labelledby="refresh-status-heading">
        <h2 id="refresh-status-heading">Refresh status</h2>
        <div className={`run-stamp ${latestRun?.status ?? "failed"}`}><strong>{latestRun?.status ?? "No run"}</strong><span>{latestRun ? `${latestRun.succeeded}/${latestRun.attempted} succeeded` : "Run market.refresh through MCP"}</span></div>
        <p>Market prices and ECB rates refresh daily through the protected Vercel cron. Manual observations retain precedence for the same date.</p>
      </section>
      <section className="page-register" aria-labelledby="instrument-data-heading">
        <h2 id="instrument-data-heading">Instrument register</h2>
        <div className="desktop-table"><table><thead><tr><th>Instrument</th><th>Class</th><th>Provider symbol</th><th>Exchange</th><th className="number-cell">Latest price</th><th>Observed</th><th>Mode</th></tr></thead><tbody>{instrumentRows.map((instrument) => { const price = latestPrices.get(instrument.id); return <tr key={instrument.id}><td><strong>{instrument.name}</strong><small>{instrument.isin ?? "No ISIN"}</small></td><td>{instrument.assetClass}</td><td>{instrument.provider} / {instrument.providerSymbol}</td><td>{instrument.exchange ?? "—"}</td><td className="number-cell">{price ? money(price.price, price.currency) : "Missing"}</td><td>{price ? displayDate(price.observedOn) : "—"}</td><td>{price?.isManual ? "Manual" : "Provider"}</td></tr>; })}</tbody></table></div>
        <div className="mobile-positions">{instrumentRows.map((instrument) => { const price = latestPrices.get(instrument.id); return <details className="mobile-position data-position" key={instrument.id}><summary><span className="mobile-rank">{instrument.nativeCurrency}</span><span className="mobile-name"><strong>{instrument.name}</strong><small>{instrument.provider} / {instrument.providerSymbol}</small></span><span className="number-cell"><strong>{price ? money(price.price, price.currency) : "Missing"}</strong><small>{price ? displayDate(price.observedOn) : "No observation"}</small></span></summary><dl><div><dt>Class</dt><dd>{instrument.assetClass}</dd></div><div><dt>Exchange</dt><dd>{instrument.exchange ?? "—"}</dd></div><div><dt>ISIN</dt><dd>{instrument.isin ?? "—"}</dd></div><div><dt>Mode</dt><dd>{price?.isManual ? "Manual" : "Provider"}</dd></div></dl></details>; })}</div>
      </section>
      <section className="split-registers">
        <div className="page-register"><h2>FX register</h2><table><thead><tr><th>Pair</th><th className="number-cell">Foreign / EUR</th><th>Observed</th></tr></thead><tbody>{[...latestRates.values()].map((rate) => <tr key={rate.quoteCurrency}><td>EUR / {rate.quoteCurrency}</td><td className="number-cell">{rate.rate}</td><td>{displayDate(rate.observedOn)}</td></tr>)}</tbody></table></div>
        <div className="page-register"><h2>Refresh ledger</h2><table><thead><tr><th>Started</th><th>Status</th><th className="number-cell">Succeeded</th></tr></thead><tbody>{runRows.map((run) => <tr key={run.id}><td>{new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(run.startedAt))}</td><td>{run.status}</td><td className="number-cell">{run.succeeded}/{run.attempted}</td></tr>)}</tbody></table></div>
      </section>
    </AppFrame>
  );
}
