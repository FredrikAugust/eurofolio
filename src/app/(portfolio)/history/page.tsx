import { connection } from "next/server";
import { Suspense } from "react";

import { PageHeading } from "@/app/app-frame";
import { displayDate, money } from "@/app/format";
import { PortfolioChart } from "@/app/portfolio-chart";
import { PagePending } from "@/app/route-pending";
import { Sparkline } from "@/app/sparkline";
import { getCachedPortfolioDashboard } from "@/server/services/cached-queries";

const colors = ["#f04d23", "#1748ba", "#0c0c0d", "#657080"];

export default function HistoryPage() {
  return (
    <Suspense fallback={<PagePending title="History" />}>
      <HistoryRegister />
    </Suspense>
  );
}

async function HistoryRegister() {
  await connection();
  const valuationDate = new Date().toISOString().slice(0, 10);
  const { summary, history } = await getCachedPortfolioDashboard(valuationDate);
  const complete = history.filter((point) => point.complete);
  return (
    <>
      <PageHeading title="History" facts={[
        { label: "Complete portfolio", value: String(complete.length) },
        { label: "Current", value: money(summary.eurTotal) },
        { label: "Begins", value: history[0] ? displayDate(history[0].time) as string : "Not recorded" },
      ]} />
      <section className="account-history-register" aria-labelledby="account-history-heading">
        <h2 id="account-history-heading">Accounts over time</h2>
        {summary.accountTotals.map((account, index) => {
          const points = history.flatMap((point) => {
            const value = point.accounts.find((candidate) => candidate.accountId === account.accountId)?.value;
            return value === null || value === undefined ? [] : [{ time: point.time, value }];
          });
          return <div className="history-account-line" style={{ color: colors[index % colors.length] }} key={account.accountId}><strong>{account.accountName}</strong><Sparkline points={points} label={`${account.accountName} account history`} color="currentColor" /><span className="history-account-value">{money(account.eurValue)}</span><small>{points.length} obs</small></div>;
        })}
      </section>
      <section className="history-register history-page-chart" aria-labelledby="history-chart-heading">
        <header><div><h2 id="history-chart-heading">Consolidated register</h2><p>Complete monthly closing values · EUR</p></div></header>
        {complete.length >= 2 ? <PortfolioChart data={complete} colors={colors} /> : <div className="history-empty"><span>HISTORY / T+0</span><strong>One complete observation.</strong><p>Trade dates reconstruct quantities; the consolidated line begins when every held instrument also has price and FX data for the same month.</p></div>}
      </section>
      <section className="page-register" aria-labelledby="snapshot-register-heading">
        <h2 id="snapshot-register-heading">Snapshot ledger</h2>
        <div className="desktop-table"><table><thead><tr><th>Date</th><th>Status</th>{summary.accountTotals.map((account) => <th className="number-cell" key={account.accountId}>{account.accountName}</th>)}<th className="number-cell">Total EUR</th></tr></thead><tbody>{history.toReversed().map((point) => <tr key={point.time}><td>{displayDate(point.time)}</td><td>{point.complete ? "Complete" : "Partial"}</td>{point.accounts.map((account) => <td className="number-cell" key={account.accountId}>{account.value === null ? "—" : money(String(account.value))}</td>)}<td className="number-cell"><strong>{point.complete ? money(String(point.value)) : "—"}</strong></td></tr>)}</tbody></table></div>
      </section>
    </>
  );
}
