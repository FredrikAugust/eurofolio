import { AppFrame, PageHeading } from "@/app/app-frame";
import { displayDate, money, quantity } from "@/app/format";
import { requireOwner } from "@/app/require-owner";
import { getDatabase } from "@/server/db/client";
import { queryActivityRegister } from "@/server/services/read-pages";

export const dynamic = "force-dynamic";

type ActivityPageProps = { searchParams: Promise<{ account?: string; type?: string }> };

const eventTypes = ["buy", "sell", "transfer_in", "transfer_out", "deposit", "withdrawal", "dividend", "fee", "tax"] as const;

function eventValue(event: { type: string; amount: string | null; quantity: string | null; unitPrice: string | null; currency: string }) {
  if (event.amount) return money(event.amount, event.currency);
  if (event.quantity && event.unitPrice) return `${quantity(event.quantity)} × ${money(event.unitPrice, event.currency)}`;
  if (event.quantity) return `${quantity(event.quantity)} units`;
  return "—";
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  await requireOwner();
  const filters = await searchParams;
  const { eventRows, accountRows, instrumentRows } = await queryActivityRegister(getDatabase());
  const accountMap = new Map(accountRows.map((account) => [account.id, account.name]));
  const instrumentMap = new Map(instrumentRows.map((instrument) => [instrument.id, instrument.name]));
  const filtered = eventRows.filter((event) => (!filters.account || event.accountId === filters.account) && (!filters.type || event.type === filters.type));
  return (
    <AppFrame current="Activity">
      <PageHeading title="Activity" measure="LEDGER" facts={[
        { label: "Visible", value: String(filtered.length) },
        { label: "All events", value: String(eventRows.length) },
        { label: "Latest", value: eventRows[0] ? displayDate(eventRows[0].effectiveDate) as string : "No events" },
      ]} />
      <form className="register-filters" action="/activity">
        <label>Account<select name="account" defaultValue={filters.account ?? ""}><option value="">All accounts</option>{accountRows.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label>
        <label>Event<select name="type" defaultValue={filters.type ?? ""}><option value="">All event types</option>{eventTypes.map((type) => <option value={type} key={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
        <button type="submit">Apply filters</button>
        <a href="/activity">Clear</a>
      </form>
      <section className="page-register" aria-labelledby="activity-register-heading">
        <h2 className="sr-only" id="activity-register-heading">Ledger events</h2>
        <div className="desktop-table"><table><thead><tr><th>Date</th><th>Event</th><th>Account</th><th>Instrument</th><th className="number-cell">Value</th><th>Note</th></tr></thead><tbody>{filtered.map((event) => <tr key={event.id}><td>{displayDate(event.effectiveDate)}</td><td><strong>{event.type.replaceAll("_", " ")}</strong></td><td>{accountMap.get(event.accountId) ?? "Unknown"}</td><td>{event.instrumentId ? instrumentMap.get(event.instrumentId) ?? "Unknown" : "Cash"}</td><td className="number-cell">{eventValue(event)}</td><td>{event.note ?? "—"}</td></tr>)}</tbody></table></div>
        <div className="mobile-positions">{filtered.map((event) => <details className="mobile-position activity-position" key={event.id}><summary><span className="mobile-rank">{displayDate(event.effectiveDate).toString().slice(0, 6)}</span><span className="mobile-name"><strong>{event.type.replaceAll("_", " ")}</strong><small>{accountMap.get(event.accountId)} · {event.instrumentId ? instrumentMap.get(event.instrumentId) : "Cash"}</small></span><span className="number-cell"><strong>{eventValue(event)}</strong></span></summary><dl><div><dt>Effective date</dt><dd>{displayDate(event.effectiveDate)}</dd></div><div><dt>Currency</dt><dd>{event.currency}</dd></div><div><dt>Note</dt><dd>{event.note ?? "—"}</dd></div></dl></details>)}</div>
        {!filtered.length ? <div className="register-empty"><strong>No matching activity.</strong><p>Change or clear the filters. Ledger changes remain MCP-only.</p></div> : null}
      </section>
    </AppFrame>
  );
}
