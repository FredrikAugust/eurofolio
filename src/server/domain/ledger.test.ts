import assert from "node:assert/strict";
import test from "node:test";

import { replayLedger, type ReplayEvent } from "@/server/domain/ledger";

const base = {
  accountId: "account",
  instrumentId: "instrument",
  currency: "EUR",
  amount: null,
};

function trade(
  id: string,
  type: "buy" | "sell",
  effectiveDate: string,
  quantity: string,
  unitPrice: string,
  createdAt = `${effectiveDate}T12:00:00.000Z`,
): ReplayEvent {
  return { ...base, id, type, effectiveDate, quantity, unitPrice, createdAt };
}

test("fractional buys and a partial sale replay deterministically", () => {
  const events = [
    trade("buy-b", "buy", "2026-01-02", "0.2", "11"),
    trade("sell", "sell", "2026-01-03", "0.1", "12"),
    trade("buy-a", "buy", "2026-01-02", "0.1", "10", "2026-01-02T10:00:00.000Z"),
  ];
  const first = replayLedger(events);
  const second = replayLedger([...events].reverse());
  assert.deepEqual([...first.holdings], [["account:instrument", "0.2"]]);
  assert.deepEqual([...first.cash], [["account:EUR", "-2"]]);
  assert.deepEqual([...first.holdings], [...second.holdings]);
  assert.deepEqual([...first.cash], [...second.cash]);
});

test("deposits, dividends, fees, tax, and withdrawals affect exact cash", () => {
  const cashEvents: ReplayEvent[] = [
    ["deposit", "100"],
    ["dividend", "5.5"],
    ["fee", "1.25"],
    ["tax", "2"],
    ["withdrawal", "10"],
  ].map(([type, amount], index) => ({
    ...base,
    id: `${index}`,
    type: type as ReplayEvent["type"],
    effectiveDate: "2026-01-01",
    quantity: null,
    unitPrice: null,
    amount,
    createdAt: `2026-01-01T00:00:0${index}.000Z`,
  }));
  assert.equal(replayLedger(cashEvents).cash.get("account:EUR"), "92.25");
});

test("a sale that would create a short is rejected", () => {
  assert.throws(
    () => replayLedger([trade("sell", "sell", "2026-01-01", "1", "10")]),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "UNSUPPORTED_SHORT",
  );
});
