import { randomUUID } from "node:crypto";

import { and, asc, eq, isNull } from "drizzle-orm";

import {
  fxRates,
  instruments,
  refreshRuns,
  securityPrices,
  type FxRateRow,
  type SecurityPriceRow,
} from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import { positiveDecimal } from "@/server/domain/decimal";
import { currencySchema, financialDateSchema } from "@/server/domain/schemas";
import type {
  FxObservation,
  FxProvider,
  SecurityPriceObservation,
  SecurityPriceProvider,
} from "@/server/market/contracts";

function metadata(value?: Record<string, unknown>): string | null {
  return value ? JSON.stringify(value) : null;
}

export type RefreshItemError = {
  target: string;
  provider: string;
  message: string;
};

export type RefreshResult = {
  runId: string;
  attempted: number;
  succeeded: number;
  failed: number;
  errors: RefreshItemError[];
};

async function settleBounded<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: "fulfilled", value: await task(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

export class MarketService {
  constructor(
    private readonly db: Database,
    private readonly securityProviders: Map<string, SecurityPriceProvider>,
    private readonly fxProvider: FxProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async search(query: string, providerId = "yahoo") {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 1 || normalizedQuery.length > 80) {
      throw new Error("Search query must contain between 1 and 80 characters.");
    }
    const provider = this.securityProviders.get(providerId);
    if (!provider) throw new Error(`No provider configured for ${providerId}.`);
    return provider.search(normalizedQuery);
  }

  async setManualPrice(input: {
    instrumentId: string;
    price: string;
    currency: string;
    observedOn: string;
    reason: string;
  }): Promise<SecurityPriceRow> {
    const price = positiveDecimal(input.price);
    const currency = currencySchema.parse(input.currency);
    const observedOn = financialDateSchema.parse(input.observedOn);
    const reason = input.reason.trim();
    if (!reason || reason.length > 500) throw new Error("A concise manual reason is required.");
    const [instrument] = await this.db
      .select()
      .from(instruments)
      .where(eq(instruments.id, input.instrumentId))
      .limit(1);
    if (!instrument) throw new Error("Instrument not found.");
    const row = {
      id: randomUUID(),
      instrumentId: input.instrumentId,
      provider: "manual",
      price,
      currency,
      observedOn,
      retrievedAt: this.now().toISOString(),
      isManual: true,
      reason,
      rawMetadata: null,
    };
    await this.db
      .insert(securityPrices)
      .values(row)
      .onConflictDoUpdate({
        target: [securityPrices.instrumentId, securityPrices.provider, securityPrices.observedOn],
        set: { price, currency, retrievedAt: row.retrievedAt, reason, isManual: true },
      });
    const [stored] = await this.db
      .select()
      .from(securityPrices)
      .where(
        and(
          eq(securityPrices.instrumentId, input.instrumentId),
          eq(securityPrices.provider, "manual"),
          eq(securityPrices.observedOn, observedOn),
        ),
      )
      .limit(1);
    return stored ?? row;
  }

  async setManualFx(input: {
    quoteCurrency: string;
    rate: string;
    observedOn: string;
    reason: string;
  }): Promise<FxRateRow> {
    const quoteCurrency = currencySchema.parse(input.quoteCurrency);
    const rate = positiveDecimal(input.rate);
    const observedOn = financialDateSchema.parse(input.observedOn);
    const reason = input.reason.trim();
    if (!reason || reason.length > 500) throw new Error("A concise manual reason is required.");
    const row = {
      id: randomUUID(),
      baseCurrency: "EUR",
      quoteCurrency,
      provider: "manual",
      rate,
      observedOn,
      retrievedAt: this.now().toISOString(),
      isManual: true,
      reason,
      rawMetadata: null,
    };
    await this.db
      .insert(fxRates)
      .values(row)
      .onConflictDoUpdate({
        target: [fxRates.baseCurrency, fxRates.quoteCurrency, fxRates.provider, fxRates.observedOn],
        set: { rate, retrievedAt: row.retrievedAt, reason, isManual: true },
      });
    const [stored] = await this.db
      .select()
      .from(fxRates)
      .where(
        and(
          eq(fxRates.baseCurrency, "EUR"),
          eq(fxRates.quoteCurrency, quoteCurrency),
          eq(fxRates.provider, "manual"),
          eq(fxRates.observedOn, observedOn),
        ),
      )
      .limit(1);
    return stored ?? row;
  }

  private persistPrice(observation: SecurityPriceObservation) {
    return this.db
      .insert(securityPrices)
      .values({
        id: randomUUID(),
        ...observation,
        isManual: false,
        reason: null,
        rawMetadata: metadata(observation.rawMetadata),
      })
      .onConflictDoUpdate({
        target: [securityPrices.instrumentId, securityPrices.provider, securityPrices.observedOn],
        set: {
          price: observation.price,
          currency: observation.currency,
          retrievedAt: observation.retrievedAt,
          rawMetadata: metadata(observation.rawMetadata),
        },
      });
  }

  private persistFx(observation: FxObservation) {
    return this.db
      .insert(fxRates)
      .values({
        id: randomUUID(),
        ...observation,
        isManual: false,
        reason: null,
        rawMetadata: metadata(observation.rawMetadata),
      })
      .onConflictDoUpdate({
        target: [fxRates.baseCurrency, fxRates.quoteCurrency, fxRates.provider, fxRates.observedOn],
        set: {
          rate: observation.rate,
          retrievedAt: observation.retrievedAt,
          rawMetadata: metadata(observation.rawMetadata),
        },
      });
  }

  async refresh(): Promise<RefreshResult> {
    const runId = randomUUID();
    const startedAt = this.now().toISOString();
    await this.db.insert(refreshRuns).values({ id: runId, status: "running", startedAt });
    const activeInstruments = await this.db
      .select()
      .from(instruments)
      .where(isNull(instruments.archivedAt))
      .orderBy(asc(instruments.id));
    const errors: RefreshItemError[] = [];
    let succeeded = 0;

    let fxObservations: FxObservation[] = [];
    try {
      fxObservations = await this.fxProvider.fetchLatest();
      if (fxObservations.length) {
        const statements = fxObservations.map((observation) => this.persistFx(observation));
        await this.db.batch(statements as [typeof statements[number], ...typeof statements[number][]]);
        succeeded += fxObservations.length;
      }
    } catch (error) {
      errors.push({
        target: "EUR FX",
        provider: this.fxProvider.id,
        message: error instanceof Error ? error.message : "Unknown FX error",
      });
    }

    const quoteResults = await settleBounded(activeInstruments, 3, async (instrument) => {
      const provider = this.securityProviders.get(instrument.provider);
      if (!provider) throw new Error(`No provider configured for ${instrument.provider}.`);
      const observation = await provider.fetchPrice(instrument);
      await this.persistPrice(observation);
      return observation;
    });
    quoteResults.forEach((result, index) => {
      if (result.status === "fulfilled") succeeded += 1;
      else {
        const instrument = activeInstruments[index];
        errors.push({
          target: instrument.providerSymbol,
          provider: instrument.provider,
          message: result.reason instanceof Error ? result.reason.message : "Unknown quote error",
        });
      }
    });

    const attempted = fxObservations.length + activeInstruments.length + (errors.some((e) => e.target === "EUR FX") ? 1 : 0);
    const failed = errors.length;
    const status = failed === 0 ? "complete" : succeeded === 0 ? "failed" : "partial";
    await this.db
      .update(refreshRuns)
      .set({
        status,
        completedAt: this.now().toISOString(),
        attempted,
        succeeded,
        failed,
        errors: errors.length ? JSON.stringify(errors) : null,
      })
      .where(eq(refreshRuns.id, runId));
    return { runId, attempted, succeeded, failed, errors };
  }
}
