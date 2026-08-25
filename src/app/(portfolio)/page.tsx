import { connection } from "next/server";
import { Suspense } from "react";

import { PortfolioDashboard } from "@/app/portfolio-dashboard";
import { OverviewPending } from "@/app/route-pending";
import { getCachedPortfolioDashboard } from "@/server/services/cached-queries";

function EmptyDashboard() {
  return (
    <section className="empty-sheet">
      <h1>No portfolio data</h1>
      <p>Create the first account and position through Eurofolio MCP.</p>
      <code>/mcp</code>
    </section>
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

  const balanceHistory = history.map(({ time, value, complete }) => ({ time, value, complete }));
  return hasData ? <PortfolioDashboard summary={summary} history={balanceHistory} priceHistory={priceHistory} periodChanges={periodChanges} /> : <EmptyDashboard />;
}
