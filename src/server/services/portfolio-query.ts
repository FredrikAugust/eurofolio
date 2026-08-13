import { asc, lte } from "drizzle-orm";

import {
  accounts,
  fxRates,
  instruments,
  ledgerEvents,
  securityPrices,
  type SecurityPriceRow,
  type AccountRow,
  type FxRateRow,
  type InstrumentRow,
  type LedgerEventRow,
} from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import { add, compare, multiply } from "@/server/domain/decimal";
import { replayLedger } from "@/server/domain/ledger";
import {
  nativeToEur,
  selectFxRate,
  selectObservation,
  type Freshness,
} from "@/server/domain/valuation";

export const PORTFOLIO_DATABASE_BATCHES = 1;

export type ValuedHolding = {
  accountId: string;
  accountName: string;
  instrumentId: string;
  instrumentName: string;
  assetClass: string;
  quantity: string;
  nativeCurrency: string;
  price: string | null;
  nativeValue: string | null;
  eurValue: string | null;
  priceProvider: string | null;
  priceDate: string | null;
  priceFreshness: Freshness;
  fxProvider: string | null;
  fxDate: string | null;
  fxFreshness: Freshness;
};

export type ValuedCash = {
  accountId: string;
  accountName: string;
  currency: string;
  nativeValue: string;
  eurValue: string | null;
  fxProvider: string | null;
  fxDate: string | null;
  fxFreshness: Freshness;
};

export type MissingValuation = {
  kind: "price" | "fx";
  accountId: string;
  instrumentId?: string;
  currency: string;
  message: string;
};

export type PortfolioSummary = {
  reportingCurrency: "EUR";
  valuationDate: string;
  eurTotal: string;
  complete: boolean;
  holdings: ValuedHolding[];
  cash: ValuedCash[];
  accountTotals: { accountId: string; accountName: string; eurValue: string }[];
  allocation: { assetClass: string; eurValue: string }[];
  missing: MissingValuation[];
};

export type PortfolioHistoryPoint = {
  time: string;
  value: number;
  complete: boolean;
  accounts: {
    accountId: string;
    accountName: string;
    value: number | null;
  }[];
};

type PortfolioRows = {
  accountRows: AccountRow[];
  instrumentRows: InstrumentRow[];
  eventRows: LedgerEventRow[];
  priceRows: SecurityPriceRow[];
  fxRows: FxRateRow[];
};

type PortfolioOptions = {
  priceStaleAfterDays?: number;
  fxStaleAfterDays?: number;
};

function selectPrice(
  rows: readonly SecurityPriceRow[],
  instrumentId: string,
  valuationDate: string,
  threshold: number,
) {
  return selectObservation(
    rows.filter((row) => row.instrumentId === instrumentId),
    valuationDate,
    threshold,
  );
}

async function loadPortfolioRows(db: Database, valuationDate: string): Promise<PortfolioRows> {
  const [accountRows, instrumentRows, eventRows, priceRows, fxRows] = await db.batch([
    db.select().from(accounts).orderBy(asc(accounts.name)),
    db.select().from(instruments).orderBy(asc(instruments.name)),
    db
      .select()
      .from(ledgerEvents)
      .where(lte(ledgerEvents.effectiveDate, valuationDate))
      .orderBy(
        asc(ledgerEvents.effectiveDate),
        asc(ledgerEvents.createdAt),
        asc(ledgerEvents.id),
      ),
    db.select().from(securityPrices).where(lte(securityPrices.observedOn, valuationDate)),
    db.select().from(fxRates).where(lte(fxRates.observedOn, valuationDate)),
  ]);
  return { accountRows, instrumentRows, eventRows, priceRows, fxRows };
}

export async function queryPortfolio(
  db: Database,
  valuationDate: string,
  options: PortfolioOptions = {},
): Promise<PortfolioSummary> {
  return buildPortfolio(await loadPortfolioRows(db, valuationDate), valuationDate, options);
}

export function buildPortfolio(
  rows: PortfolioRows,
  valuationDate: string,
  options: PortfolioOptions = {},
): PortfolioSummary {
  const priceThreshold = options.priceStaleAfterDays ?? 5;
  const fxThreshold = options.fxStaleAfterDays ?? 3;
  const { accountRows, instrumentRows, priceRows, fxRows } = rows;
  const eventRows = rows.eventRows.filter(
    (event) => event.effectiveDate <= valuationDate,
  );

  const projection = replayLedger(eventRows);
  const accountMap = new Map(accountRows.map((account) => [account.id, account]));
  const instrumentMap = new Map(
    instrumentRows.map((instrument) => [instrument.id, instrument]),
  );
  const accountTotals = new Map(accountRows.map((account) => [account.id, "0"]));
  const allocation = new Map<string, string>();
  const missing: MissingValuation[] = [];
  const holdings: ValuedHolding[] = [];
  const cash: ValuedCash[] = [];

  for (const [key, quantity] of projection.holdings) {
    if (compare(quantity, "0") === 0) continue;
    const [accountId, instrumentId] = key.split(":");
    const account = accountMap.get(accountId);
    const instrument = instrumentMap.get(instrumentId);
    if (!account || !instrument) continue;
    const selectedPrice = selectPrice(
      priceRows,
      instrumentId,
      valuationDate,
      priceThreshold,
    );
    const price = selectedPrice.observation;
    let nativeValue: string | null = null;
    let eurValue: string | null = null;
    let fx = null;
    if (!price) {
      missing.push({
        kind: "price",
        accountId,
        instrumentId,
        currency: instrument.nativeCurrency,
        message: `No price for ${instrument.name} on or before ${valuationDate}.`,
      });
    } else {
      nativeValue = multiply(quantity, price.price);
      fx = selectFxRate(price.currency, fxRows, valuationDate, fxThreshold);
      if (!fx) {
        missing.push({
          kind: "fx",
          accountId,
          instrumentId,
          currency: price.currency,
          message: `No EUR/${price.currency} rate on or before ${valuationDate}.`,
        });
      } else {
        eurValue = nativeToEur(nativeValue, fx.rate);
        accountTotals.set(accountId, add(accountTotals.get(accountId) ?? "0", eurValue));
        allocation.set(
          instrument.assetClass,
          add(allocation.get(instrument.assetClass) ?? "0", eurValue),
        );
      }
    }
    holdings.push({
      accountId,
      accountName: account.name,
      instrumentId,
      instrumentName: instrument.name,
      assetClass: instrument.assetClass,
      quantity,
      nativeCurrency: price?.currency ?? instrument.nativeCurrency,
      price: price?.price ?? null,
      nativeValue,
      eurValue,
      priceProvider: price?.provider ?? null,
      priceDate: price?.observedOn ?? null,
      priceFreshness: selectedPrice.freshness,
      fxProvider: fx?.provider ?? null,
      fxDate: fx?.observedOn ?? null,
      fxFreshness: fx?.freshness ?? "missing",
    });
  }

  for (const [key, nativeValue] of projection.cash) {
    if (compare(nativeValue, "0") === 0) continue;
    const [accountId, currency] = key.split(":");
    const account = accountMap.get(accountId);
    if (!account) continue;
    const fx = selectFxRate(currency, fxRows, valuationDate, fxThreshold);
    const eurValue = fx ? nativeToEur(nativeValue, fx.rate) : null;
    if (!fx) {
      missing.push({
        kind: "fx",
        accountId,
        currency,
        message: `No EUR/${currency} rate for cash on or before ${valuationDate}.`,
      });
    } else if (eurValue) {
      accountTotals.set(accountId, add(accountTotals.get(accountId) ?? "0", eurValue));
      allocation.set("cash", add(allocation.get("cash") ?? "0", eurValue));
    }
    cash.push({
      accountId,
      accountName: account.name,
      currency,
      nativeValue,
      eurValue,
      fxProvider: fx?.provider ?? null,
      fxDate: fx?.observedOn ?? null,
      fxFreshness: fx?.freshness ?? "missing",
    });
  }

  const eurTotal = [...accountTotals.values()].reduce(add, "0");
  return {
    reportingCurrency: "EUR",
    valuationDate,
    eurTotal,
    complete: missing.length === 0,
    holdings: holdings.sort((left, right) => {
      if (left.eurValue === null) return right.eurValue === null ? 0 : 1;
      if (right.eurValue === null) return -1;
      return compare(right.eurValue, left.eurValue);
    }),
    cash,
    accountTotals: accountRows.map((account) => ({
      accountId: account.id,
      accountName: account.name,
      eurValue: accountTotals.get(account.id) ?? "0",
    })),
    allocation: [...allocation].map(([assetClass, eurValue]) => ({ assetClass, eurValue })),
    missing,
  };
}

function monthSampleDates(firstDate: string, endDate: string, limit: number): string[] {
  const [year, month] = endDate.split("-").map(Number);
  const candidates = new Set<string>([endDate]);
  for (let offset = 1; offset < limit; offset += 1) {
    const sample = new Date(Date.UTC(year, month - offset, 0));
    const date = sample.toISOString().slice(0, 10);
    if (date < firstDate) break;
    candidates.add(date);
  }
  candidates.add(firstDate);
  return [...candidates].sort();
}

export async function queryPortfolioHistory(
  db: Database,
  valuationDate: string,
  options: PortfolioOptions = {},
  sampleLimit = 25,
): Promise<PortfolioHistoryPoint[]> {
  const { accountRows, instrumentRows, eventRows, priceRows, fxRows } =
    await loadPortfolioRows(db, valuationDate);
  if (eventRows.length === 0) return [];

  const rows = { accountRows, instrumentRows, eventRows, priceRows, fxRows };
  return monthSampleDates(eventRows[0].effectiveDate, valuationDate, sampleLimit).map(
    (time) => historyPoint(buildPortfolio(rows, time, options)),
  );
}

function historyPoint(summary: PortfolioSummary): PortfolioHistoryPoint {
  const incompleteAccounts = new Set(summary.missing.map((item) => item.accountId));
  return {
    time: summary.valuationDate,
    value: Number(summary.eurTotal),
    complete: summary.complete,
    accounts: summary.accountTotals.map((account) => ({
      accountId: account.accountId,
      accountName: account.accountName,
      value: incompleteAccounts.has(account.accountId) ? null : Number(account.eurValue),
    })),
  };
}

export async function queryPortfolioDashboard(
  db: Database,
  valuationDate: string,
  options: PortfolioOptions = {},
): Promise<{ summary: PortfolioSummary; history: PortfolioHistoryPoint[] }> {
  const rows = await loadPortfolioRows(db, valuationDate);
  const summary = buildPortfolio(rows, valuationDate, options);
  if (rows.eventRows.length === 0) return { summary, history: [] };
  const history = monthSampleDates(
    rows.eventRows[0].effectiveDate,
    valuationDate,
    25,
  ).map((time) => historyPoint(buildPortfolio(rows, time, options)));
  return { summary, history };
}
