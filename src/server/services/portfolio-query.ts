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
import { add, compare, divide, multiply, subtract } from "@/server/domain/decimal";
import { replayOrderedLedger } from "@/server/domain/ledger";
import {
  nativeToEur,
  selectFxRate,
  selectObservation,
  type Freshness,
} from "@/server/domain/valuation";

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

export type PriceHistoryPoint = {
  time: string;
  value: number;
};

export type InstrumentPriceHistory = {
  instrumentId: string;
  points: PriceHistoryPoint[];
};

export type PortfolioPeriodChange = {
  label: "1D" | "1W" | "1M" | "3M";
  from: string;
  amount: string | null;
  percent: string | null;
};

type PortfolioRows = {
  accountRows: AccountRow[];
  accountMap: Map<string, AccountRow>;
  instrumentMap: Map<string, InstrumentRow>;
  eventRows: LedgerEventRow[];
  eventsByInstrument: Map<string, LedgerEventRow[]>;
  priceRows: SecurityPriceRow[];
  pricesByInstrument: Map<string, SecurityPriceRow[]>;
  fxByCurrency: Map<string, FxRateRow[]>;
};

type PortfolioOptions = {
  priceStaleAfterDays?: number;
  fxStaleAfterDays?: number;
};

function groupBy<T>(rows: readonly T[], keyOf: (row: T) => string | null) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }
  return grouped;
}

function eventsThroughDate(rows: readonly LedgerEventRow[], valuationDate: string) {
  let start = 0;
  let end = rows.length;
  while (start < end) {
    const middle = (start + end) >>> 1;
    if (rows[middle].effectiveDate <= valuationDate) start = middle + 1;
    else end = middle;
  }
  return rows.slice(0, start);
}

function selectPrice(
  rows: PortfolioRows,
  instrumentId: string,
  valuationDate: string,
  threshold: number,
) {
  const marketPrice = selectObservation(
    rows.pricesByInstrument.get(instrumentId) ?? [],
    valuationDate,
    threshold,
  );
  if (marketPrice.observation) return marketPrice;

  const tradePrices: SecurityPriceRow[] = (rows.eventsByInstrument.get(instrumentId) ?? []).flatMap((event) => {
    if (!event.unitPrice || event.effectiveDate > valuationDate) return [];
    return [{
      id: `trade:${event.id}`,
      instrumentId,
      provider: "trade",
      price: event.unitPrice,
      currency: event.currency,
      observedOn: event.effectiveDate,
      retrievedAt: event.createdAt,
      isManual: true,
      reason: "Recorded execution price",
      rawMetadata: null,
    }];
  });
  return selectObservation(tradePrices, valuationDate, threshold);
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
  return {
    accountRows,
    accountMap: new Map(accountRows.map((row) => [row.id, row])),
    instrumentMap: new Map(instrumentRows.map((row) => [row.id, row])),
    eventRows,
    eventsByInstrument: groupBy(eventRows, (row) => row.instrumentId),
    priceRows,
    pricesByInstrument: groupBy(priceRows, (row) => row.instrumentId),
    fxByCurrency: groupBy(fxRows, (row) => row.quoteCurrency),
  };
}

export async function queryPortfolio(
  db: Database,
  valuationDate: string,
  options: PortfolioOptions = {},
): Promise<PortfolioSummary> {
  return buildPortfolio(await loadPortfolioRows(db, valuationDate), valuationDate, options);
}

function buildPortfolio(
  rows: PortfolioRows,
  valuationDate: string,
  options: PortfolioOptions = {},
): PortfolioSummary {
  const priceThreshold = options.priceStaleAfterDays ?? 5;
  const fxThreshold = options.fxStaleAfterDays ?? 3;
  const { accountRows, accountMap, instrumentMap, fxByCurrency } = rows;
  const eventRows = eventsThroughDate(rows.eventRows, valuationDate);

  const projection = replayOrderedLedger(eventRows);
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
      rows,
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
      fx = selectFxRate(
        price.currency,
        fxByCurrency.get(price.currency) ?? [],
        valuationDate,
        fxThreshold,
      );
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
    const fx = selectFxRate(
      currency,
      fxByCurrency.get(currency) ?? [],
      valuationDate,
      fxThreshold,
    );
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

function historySampleDates(firstDate: string, endDate: string): string[] {
  const candidates = new Set(monthSampleDates(firstDate, endDate, 25));
  const cursor = new Date(`${endDate}T00:00:00Z`);
  for (let offset = 0; offset < 93; offset += 1) {
    const date = cursor.toISOString().slice(0, 10);
    if (date < firstDate) break;
    candidates.add(date);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return [...candidates].sort();
}

function shiftedDate(value: string, days = 0, months = 0): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (months) {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - months);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
  }
  if (days) date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function portfolioPeriodChanges(
  current: PortfolioSummary,
  portfolioAt: (date: string) => PortfolioSummary,
  observationDates: readonly string[],
): PortfolioPeriodChange[] {
  const asOf = observationDates.filter((date) => date <= current.valuationDate).at(-1)
    ?? current.valuationDate;
  const previousClose = observationDates.filter((date) => date < asOf).at(-1)
    ?? shiftedDate(asOf, 1);
  const periods = [
    { label: "1D" as const, from: previousClose },
    { label: "1W" as const, from: shiftedDate(asOf, 7) },
    { label: "1M" as const, from: shiftedDate(asOf, 0, 1) },
    { label: "3M" as const, from: shiftedDate(asOf, 0, 3) },
  ];

  return periods.map(({ label, from }) => {
    const previous = portfolioAt(from);
    if (!current.complete || !previous.complete || compare(previous.eurTotal, "0") === 0) {
      return { label, from, amount: null, percent: null };
    }
    const amount = subtract(current.eurTotal, previous.eurTotal);
    const percent = multiply(divide(amount, previous.eurTotal), "100");
    return { label, from, amount, percent };
  });
}

export async function queryPortfolioHistory(
  db: Database,
  valuationDate: string,
  options: PortfolioOptions = {},
  sampleLimit = 25,
): Promise<PortfolioHistoryPoint[]> {
  const rows = await loadPortfolioRows(db, valuationDate);
  if (rows.eventRows.length === 0) return [];

  return monthSampleDates(rows.eventRows[0].effectiveDate, valuationDate, sampleLimit).map(
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

function instrumentPriceHistory(rows: readonly SecurityPriceRow[]): InstrumentPriceHistory[] {
  const byInstrument = new Map<string, Map<string, SecurityPriceRow>>();
  for (const row of rows) {
    const byDate = byInstrument.get(row.instrumentId) ?? new Map<string, SecurityPriceRow>();
    const current = byDate.get(row.observedOn);
    if (
      !current ||
      (row.isManual && !current.isManual) ||
      (row.isManual === current.isManual && row.retrievedAt > current.retrievedAt)
    ) {
      byDate.set(row.observedOn, row);
    }
    byInstrument.set(row.instrumentId, byDate);
  }
  return [...byInstrument].map(([instrumentId, byDate]) => ({
    instrumentId,
    points: [...byDate.values()]
      .sort((left, right) => left.observedOn.localeCompare(right.observedOn))
      .slice(-32)
      .map((row) => ({ time: row.observedOn, value: Number(row.price) })),
  }));
}

export async function queryPortfolioDashboard(
  db: Database,
  valuationDate: string,
  options: PortfolioOptions = {},
): Promise<{
  summary: PortfolioSummary;
  history: PortfolioHistoryPoint[];
  priceHistory: InstrumentPriceHistory[];
  periodChanges: PortfolioPeriodChange[];
}> {
  const rows = await loadPortfolioRows(db, valuationDate);
  const summary = buildPortfolio(rows, valuationDate, options);
  const summaries = new Map([[valuationDate, summary]]);
  const portfolioAt = (date: string) => {
    const existing = summaries.get(date);
    if (existing) return existing;
    const value = buildPortfolio(rows, date, options);
    summaries.set(date, value);
    return value;
  };
  const priceHistory = instrumentPriceHistory(rows.priceRows);
  const observationDates = [...new Set(rows.priceRows.map((row) => row.observedOn))].sort();
  const periodChanges = portfolioPeriodChanges(summary, portfolioAt, observationDates);
  if (rows.eventRows.length === 0) return { summary, history: [], priceHistory, periodChanges };
  const history = historySampleDates(rows.eventRows[0].effectiveDate, valuationDate)
    .map((time) => historyPoint(portfolioAt(time)));
  return { summary, history, priceHistory, periodChanges };
}
