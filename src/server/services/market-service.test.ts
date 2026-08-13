import assert from "node:assert/strict";
import test from "node:test";

import { fxRates, refreshRuns, securityPrices } from "@/server/db/schema";
import type { FxProvider, SecurityPriceProvider } from "@/server/market/contracts";
import { LedgerService } from "@/server/services/ledger-service";
import { MarketService } from "@/server/services/market-service";
import { createTestDatabase } from "@/server/test/database";

test("refresh isolates failures, persists idempotently, and preserves last-known-good", async () => {
  const fixture = await createTestDatabase();
  const ledger = new LedgerService(fixture.db);
  const good = await ledger.createInstrument({
    name: "Good",
    assetClass: "stock",
    nativeCurrency: "USD",
    provider: "fixture",
    providerSymbol: "GOOD",
  });
  await ledger.createInstrument({
    name: "Bad",
    assetClass: "stock",
    nativeCurrency: "USD",
    provider: "fixture",
    providerSymbol: "BAD",
  });
  const priceProvider: SecurityPriceProvider = {
    id: "fixture",
    search: async () => [],
    fetchPrice: async (instrument) => {
      if (instrument.providerSymbol === "BAD") throw new Error("fixture outage");
      return {
        instrumentId: instrument.id,
        provider: "fixture",
        price: "100",
        currency: "USD",
        observedOn: "2026-08-11",
        retrievedAt: "2026-08-12T12:00:00.000Z",
      };
    },
  };
  const fxProvider: FxProvider = {
    id: "fixture-fx",
    fetchLatest: async () => [
      {
        baseCurrency: "EUR",
        quoteCurrency: "USD",
        provider: "fixture-fx",
        rate: "1.2",
        observedOn: "2026-08-11",
        retrievedAt: "2026-08-12T12:00:00.000Z",
      },
    ],
  };
  const service = new MarketService(
    fixture.db,
    new Map([["fixture", priceProvider]]),
    fxProvider,
    () => new Date("2026-08-12T12:00:00.000Z"),
  );
  const first = await service.refresh();
  const second = await service.refresh();
  assert.equal(first.failed, 1);
  assert.equal(first.succeeded, 2);
  assert.equal(second.failed, 1);
  assert.equal((await fixture.db.select().from(securityPrices)).length, 1);
  assert.equal((await fixture.db.select().from(fxRates)).length, 1);
  assert.equal((await fixture.db.select().from(refreshRuns)).length, 2);
  assert.equal((await fixture.db.select().from(securityPrices))[0].instrumentId, good.id);
  fixture.close();
});

test("manual observations update one row and retain reason metadata", async () => {
  const fixture = await createTestDatabase();
  const ledger = new LedgerService(fixture.db);
  const instrument = await ledger.createInstrument({
    name: "Manual",
    assetClass: "etf",
    nativeCurrency: "GBP",
    provider: "yahoo",
    providerSymbol: "TEST.L",
  });
  const service = new MarketService(
    fixture.db,
    new Map(),
    { id: "none", fetchLatest: async () => [] },
  );
  await service.setManualPrice({
    instrumentId: instrument.id,
    price: "10",
    currency: "GBP",
    observedOn: "2026-08-10",
    reason: "provider correction",
  });
  await service.setManualPrice({
    instrumentId: instrument.id,
    price: "11",
    currency: "GBP",
    observedOn: "2026-08-10",
    reason: "updated close",
  });
  await service.setManualFx({
    quoteCurrency: "GBP",
    rate: "0.85",
    observedOn: "2026-08-10",
    reason: "statement rate",
  });
  const prices = await fixture.db.select().from(securityPrices);
  assert.equal(prices.length, 1);
  assert.equal(prices[0].price, "11");
  assert.equal(prices[0].reason, "updated close");
  assert.equal((await fixture.db.select().from(fxRates))[0].isManual, true);
  fixture.close();
});

test("backfill stores only real month-end observations and is idempotent", async () => {
  const fixture = await createTestDatabase();
  const ledger = new LedgerService(fixture.db);
  const instrument = await ledger.createInstrument({
    name: "History",
    assetClass: "etf",
    nativeCurrency: "USD",
    provider: "fixture",
    providerSymbol: "HISTORY",
  });
  const priceProvider: SecurityPriceProvider = {
    id: "fixture",
    search: async () => [],
    fetchPrice: async () => { throw new Error("unused"); },
    fetchHistory: async () => [
      { instrumentId: instrument.id, provider: "fixture", price: "10", currency: "USD", observedOn: "2026-06-29", retrievedAt: "2026-08-12T00:00:00Z" },
      { instrumentId: instrument.id, provider: "fixture", price: "11", currency: "USD", observedOn: "2026-06-30", retrievedAt: "2026-08-12T00:00:00Z" },
      { instrumentId: instrument.id, provider: "fixture", price: "12", currency: "USD", observedOn: "2026-07-31", retrievedAt: "2026-08-12T00:00:00Z" },
    ],
  };
  const fxProvider: FxProvider = {
    id: "fixture-fx",
    fetchLatest: async () => [],
    fetchHistory: async () => [
      { baseCurrency: "EUR", quoteCurrency: "USD", provider: "fixture-fx", rate: "1.1", observedOn: "2026-06-30", retrievedAt: "2026-08-12T00:00:00Z" },
      { baseCurrency: "EUR", quoteCurrency: "USD", provider: "fixture-fx", rate: "1.2", observedOn: "2026-07-31", retrievedAt: "2026-08-12T00:00:00Z" },
    ],
  };
  const service = new MarketService(fixture.db, new Map([["fixture", priceProvider]]), fxProvider);
  const first = await service.backfill("2026-06-01", "2026-07-31");
  const second = await service.backfill("2026-06-01", "2026-07-31");
  assert.equal(first.priceObservationsStored, 2);
  assert.equal(first.fxObservationsStored, 2);
  assert.equal(second.errors.length, 0);
  assert.equal((await fixture.db.select().from(securityPrices)).length, 2);
  assert.equal((await fixture.db.select().from(fxRates)).length, 2);
  fixture.close();
});
