import assert from "node:assert/strict";
import test from "node:test";

import {
  currencySchema,
  financialDateSchema,
  ledgerEventInputSchema,
  validationIssues,
} from "@/server/domain/schemas";

test("currency and financial dates are strict", () => {
  assert.equal(currencySchema.parse("EUR"), "EUR");
  assert.throws(() => currencySchema.parse("eur"));
  assert.equal(financialDateSchema.parse("2026-02-28"), "2026-02-28");
  assert.throws(() => financialDateSchema.parse("2026-02-30"));
});

test("ledger validation produces stable machine-readable issues", () => {
  const result = ledgerEventInputSchema.safeParse({
    type: "buy",
    accountId: "not-an-id",
    effectiveDate: "2026-99-01",
    currency: "usd",
    instrumentId: "also-not-an-id",
    quantity: "1e2",
    unitPrice: "0",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const issues = validationIssues(result.error);
    assert.ok(issues.length >= 5);
    assert.ok(issues.every((issue) => issue.code === "VALIDATION_ERROR"));
  }
});
