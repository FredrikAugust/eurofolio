import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "@/server/domain/errors";
import { replayLedger } from "@/server/domain/ledger";
import { LedgerService } from "@/server/services/ledger-service";
import { createTestDatabase } from "@/server/test/database";

async function fixture() {
  const database = await createTestDatabase();
  const service = new LedgerService(
    database.db,
    () => new Date("2026-08-12T12:00:00.000Z"),
  );
  const account = await service.createAccount({
    name: "Pension",
    institution: "Example",
    defaultCurrency: "EUR",
  });
  const instrument = await service.createInstrument({
    name: "World ETF",
    assetClass: "etf",
    nativeCurrency: "EUR",
    provider: "yahoo",
    providerSymbol: "VWCE.DE",
  });
  return { ...database, service, account, instrument };
}

test("account and instrument repositories create, list, lookup, and archive", async () => {
  const { service, account, instrument, close } = await fixture();
  assert.equal((await service.getAccount(account.id)).name, "Pension");
  assert.equal((await service.renameAccount(account.id, "Long term")).name, "Long term");
  assert.equal((await service.listAccounts()).length, 1);
  await service.archiveAccount(account.id);
  assert.equal((await service.listAccounts()).length, 0);
  assert.equal((await service.listAccounts(true)).length, 1);
  assert.equal((await service.getInstrument(instrument.id)).providerSymbol, "VWCE.DE");
  await service.archiveInstrument(instrument.id);
  assert.equal((await service.listInstruments()).length, 0);
  close();
});

test("event writes are idempotent and batch ingestion is atomic", async () => {
  const { service, account, instrument, close } = await fixture();
  const buy = {
    type: "buy" as const,
    accountId: account.id,
    instrumentId: instrument.id,
    effectiveDate: "2026-08-01",
    currency: "EUR",
    quantity: "1.5",
    unitPrice: "100",
    idempotencyKey: "buy-1",
  };
  const first = await service.createEvent(buy);
  const retry = await service.createEvent(buy);
  assert.equal(retry.id, first.id);

  await assert.rejects(
    () =>
      service.ingestEvents([
        {
          type: "deposit",
          accountId: account.id,
          effectiveDate: "2026-08-01",
          currency: "EUR",
          amount: "1000",
          idempotencyKey: "deposit-1",
        },
        {
          type: "sell",
          accountId: account.id,
          instrumentId: instrument.id,
          effectiveDate: "2026-08-02",
          currency: "EUR",
          quantity: "2",
          unitPrice: "101",
          idempotencyKey: "sell-too-many",
        },
      ]),
    (error: unknown) => error instanceof DomainError && error.code === "UNSUPPORTED_SHORT",
  );
  assert.equal((await service.listEvents()).length, 1);
  close();
});

test("correction and deletion produce a repeatable projection", async () => {
  const { service, account, instrument, close } = await fixture();
  const event = await service.createEvent({
    type: "buy",
    accountId: account.id,
    instrumentId: instrument.id,
    effectiveDate: "2026-08-01",
    currency: "EUR",
    quantity: "2",
    unitPrice: "10",
  });
  await service.correctEvent(event.id, {
    type: "buy",
    accountId: account.id,
    instrumentId: instrument.id,
    effectiveDate: "2026-08-01",
    currency: "EUR",
    quantity: "1.25",
    unitPrice: "10",
  });
  const events = await service.listEvents();
  const projection = replayLedger(events);
  assert.equal(projection.holdings.get(`${account.id}:${instrument.id}`), "1.25");
  await service.deleteEvent(event.id);
  assert.equal((await service.listEvents()).length, 0);
  close();
});
