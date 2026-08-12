import assert from "node:assert/strict";
import test from "node:test";

import { nativeToEur, selectFxRate, selectObservation } from "@/server/domain/valuation";

const observations = [
  {
    quoteCurrency: "USD",
    rate: "1.2",
    observedOn: "2026-08-07",
    retrievedAt: "2026-08-07T16:00:00.000Z",
    provider: "ecb",
    isManual: false,
  },
  {
    quoteCurrency: "USD",
    rate: "1.25",
    observedOn: "2026-08-07",
    retrievedAt: "2026-08-07T17:00:00.000Z",
    provider: "manual",
    isManual: true,
  },
];

test("foreign units per EUR convert by division and EUR is identity", () => {
  assert.equal(nativeToEur("120", "1.2"), "100");
  assert.deepEqual(selectFxRate("EUR", [], "2026-08-09", 3), {
    rate: "1",
    observedOn: "2026-08-09",
    provider: "identity",
    freshness: "current",
    isManual: false,
  });
});

test("weekend selection uses latest prior rate and manual wins the date", () => {
  const selected = selectFxRate("USD", observations, "2026-08-09", 3);
  assert.equal(selected?.rate, "1.25");
  assert.equal(selected?.observedOn, "2026-08-07");
  assert.equal(selected?.freshness, "manual");
});

test("missing and stale observations are explicit", () => {
  assert.equal(selectFxRate("GBP", observations, "2026-08-09", 3), null);
  assert.equal(
    selectObservation([observations[0]], "2026-08-20", 3).freshness,
    "stale",
  );
});
