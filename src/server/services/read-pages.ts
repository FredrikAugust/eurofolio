import { asc, desc } from "drizzle-orm";

import { accounts, fxRates, instruments, ledgerEvents, refreshRuns, securityPrices } from "@/server/db/schema";
import type { Database } from "@/server/db/types";

export async function queryActivityRegister(db: Database) {
  const [eventRows, accountRows, instrumentRows] = await db.batch([
    db.select().from(ledgerEvents).orderBy(desc(ledgerEvents.effectiveDate), desc(ledgerEvents.createdAt), desc(ledgerEvents.id)),
    db.select().from(accounts).orderBy(asc(accounts.name)),
    db.select().from(instruments).orderBy(asc(instruments.name)),
  ]);
  return { eventRows, accountRows, instrumentRows };
}

export async function queryDataRegister(db: Database) {
  const [instrumentRows, priceRows, rateRows, runRows] = await db.batch([
    db.select().from(instruments).orderBy(asc(instruments.name)),
    db.select().from(securityPrices).orderBy(desc(securityPrices.observedOn), desc(securityPrices.retrievedAt)),
    db.select().from(fxRates).orderBy(desc(fxRates.observedOn), asc(fxRates.quoteCurrency)),
    db.select().from(refreshRuns).orderBy(desc(refreshRuns.startedAt)).limit(12),
  ]);
  return { instrumentRows, priceRows, rateRows, runRows };
}
