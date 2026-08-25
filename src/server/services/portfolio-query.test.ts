import assert from "node:assert/strict";
import test from "node:test";

import { fxRates, securityPrices } from "@/server/db/schema";
import { LedgerService } from "@/server/services/ledger-service";
import {
  queryPortfolio,
  queryPortfolioDashboard,
  queryPortfolioHistory,
} from "@/server/services/portfolio-query";
import { createTestDatabase } from "@/server/test/database";

test("portfolio values EUR, USD, GBP, and DKK with partial diagnostics", async () => {
  const { db, close } = await createTestDatabase();
  const service = new LedgerService(db, () => new Date("2026-08-10T12:00:00.000Z"));
  const account = await service.createAccount({
    name: "Everything",
    institution: "",
    defaultCurrency: "EUR",
  });
  const currencies = ["EUR", "USD", "GBP", "DKK", "CHF", "SEK"] as const;
  const registered = await Promise.all(
    currencies.map((currency) =>
      service.createInstrument({
        name: `${currency} ETF`,
        assetClass: "etf",
        nativeCurrency: currency,
        provider: "yahoo",
        providerSymbol: `${currency}.TEST`,
      }),
    ),
  );
  await service.ingestEvents(
    registered.flatMap((instrument) => [
      {
        type: "deposit" as const,
        accountId: account.id,
        effectiveDate: "2026-08-07",
        currency: instrument.nativeCurrency,
        amount: "20",
      },
      {
        type: "buy" as const,
        accountId: account.id,
        instrumentId: instrument.id,
        effectiveDate: "2026-08-07",
        currency: instrument.nativeCurrency,
        quantity: "2",
        unitPrice: "10",
      },
    ]),
  );
  await db.insert(securityPrices).values(
    registered.slice(0, 5).map((instrument, index) => ({
      id: `price-${index}`,
      instrumentId: instrument.id,
      provider: index === 1 ? "manual" : "fixture",
      price: index === 1 ? "12.5" : "10",
      currency: instrument.nativeCurrency,
      observedOn: "2026-08-07",
      retrievedAt: "2026-08-07T18:00:00.000Z",
      isManual: index === 1,
      reason: index === 1 ? "test override" : null,
    })),
  );
  await db.insert(fxRates).values([
    {
      id: "usd",
      quoteCurrency: "USD",
      provider: "ecb",
      rate: "1.25",
      observedOn: "2026-08-07",
      retrievedAt: "2026-08-07T18:00:00.000Z",
    },
    {
      id: "gbp",
      quoteCurrency: "GBP",
      provider: "ecb",
      rate: "0.8",
      observedOn: "2026-08-07",
      retrievedAt: "2026-08-07T18:00:00.000Z",
    },
    {
      id: "dkk",
      quoteCurrency: "DKK",
      provider: "ecb",
      rate: "7.46",
      observedOn: "2026-08-07",
      retrievedAt: "2026-08-07T18:00:00.000Z",
    },
  ]);

  const result = await queryPortfolio(db, "2026-08-09");
  assert.equal(result.complete, false);
  assert.equal(result.missing.length, 2);
  assert.deepEqual(
    result.missing.map((item) => item.kind).sort(),
    ["fx", "fx"],
  );
  assert.equal(result.holdings.find((item) => item.nativeCurrency === "EUR")?.eurValue, "20");
  assert.equal(result.holdings.find((item) => item.nativeCurrency === "USD")?.eurValue, "20");
  assert.equal(result.holdings.find((item) => item.nativeCurrency === "GBP")?.eurValue, "25");
  assert.equal(
    result.holdings.find((item) => item.nativeCurrency === "DKK")?.eurValue,
    "2.68096514745308311",
  );
  assert.equal(result.holdings.find((item) => item.nativeCurrency === "USD")?.priceFreshness, "manual");
  assert.equal(result.holdings[0].eurValue, "25");
  assert.equal(result.holdings.at(-1)?.eurValue, null);

  const history = await queryPortfolioHistory(db, "2026-08-09");
  assert.equal(history.at(-1)?.complete, false);
  assert.equal(history.at(-1)?.accounts[0].value, null);
  close();
});

test("dashboard portfolio loading executes one batch as holdings grow", async () => {
  const fixture = await createTestDatabase();
  let batches = 0;
  const db = new Proxy(fixture.db, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (property === "batch") {
        return (...arguments_: Parameters<typeof fixture.db.batch>) => {
          batches += 1;
          return fixture.db.batch(...arguments_);
        };
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  await queryPortfolio(db, "2026-08-09");
  assert.equal(batches, 1);
  await queryPortfolio(db, "2026-08-10");
  assert.equal(batches, 2);
  fixture.close();
});

test("dashboard reports exact portfolio changes for standard periods", async () => {
  const { db, close } = await createTestDatabase();
  const service = new LedgerService(db, () => new Date("2026-08-10T12:00:00.000Z"));
  const account = await service.createAccount({ name: "Main", institution: "", defaultCurrency: "EUR" });
  const instrument = await service.createInstrument({
    name: "Index fund",
    assetClass: "fund",
    nativeCurrency: "EUR",
    provider: "manual",
    providerSymbol: "INDEX",
  });
  await service.ingestEvents([
    { type: "deposit", accountId: account.id, effectiveDate: "2026-05-01", currency: "EUR", amount: "100" },
    { type: "buy", accountId: account.id, instrumentId: instrument.id, effectiveDate: "2026-05-01", currency: "EUR", quantity: "1", unitPrice: "100" },
  ]);
  await db.insert(securityPrices).values([
    { id: "previous", instrumentId: instrument.id, provider: "manual", price: "100", currency: "EUR", observedOn: "2026-08-09", retrievedAt: "2026-08-09T18:00:00.000Z", isManual: true },
    { id: "current", instrumentId: instrument.id, provider: "manual", price: "110", currency: "EUR", observedOn: "2026-08-10", retrievedAt: "2026-08-10T18:00:00.000Z", isManual: true },
  ]);

  const dashboard = await queryPortfolioDashboard(db, "2026-08-10");
  assert.deepEqual(dashboard.periodChanges.map((change) => change.label), ["1D", "1W", "1M", "3M", "1Y", "ALL"]);
  assert.equal(dashboard.periodChanges[0].amount, "10");
  assert.equal(dashboard.periodChanges[0].percent, "10");
  assert.equal(dashboard.periodChanges[3].amount, "10");
  assert.equal(dashboard.periodChanges[3].percent, "10");
  close();
});

test("dashboard 1D compares the latest two market closes on a weekend", async () => {
  const { db, close } = await createTestDatabase();
  const service = new LedgerService(db, () => new Date("2026-08-22T12:00:00.000Z"));
  const account = await service.createAccount({ name: "Main", institution: "", defaultCurrency: "EUR" });
  const instrument = await service.createInstrument({
    name: "Index fund", assetClass: "fund", nativeCurrency: "EUR", provider: "manual", providerSymbol: "INDEX",
  });
  await service.ingestEvents([
    { type: "deposit", accountId: account.id, effectiveDate: "2026-08-01", currency: "EUR", amount: "100" },
    { type: "buy", accountId: account.id, instrumentId: instrument.id, effectiveDate: "2026-08-01", currency: "EUR", quantity: "1", unitPrice: "100" },
  ]);
  await db.insert(securityPrices).values([
    { id: "thursday", instrumentId: instrument.id, provider: "manual", price: "100", currency: "EUR", observedOn: "2026-08-20", retrievedAt: "2026-08-20T20:00:00.000Z", isManual: true },
    { id: "friday", instrumentId: instrument.id, provider: "manual", price: "105", currency: "EUR", observedOn: "2026-08-21", retrievedAt: "2026-08-21T20:00:00.000Z", isManual: true },
  ]);

  const dashboard = await queryPortfolioDashboard(db, "2026-08-22");
  assert.equal(dashboard.periodChanges[0].from, "2026-08-20");
  assert.equal(dashboard.periodChanges[0].amount, "5");
  assert.equal(dashboard.periodChanges[0].percent, "5");
  close();
});
