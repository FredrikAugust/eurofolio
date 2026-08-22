import assert from "node:assert/strict";
import test from "node:test";

import { latestObservationPerMonth, recentDailyAndMonthly } from "@/server/market/history";

test("monthly history retains the last real observation without relabeling it", () => {
  const result = latestObservationPerMonth([
    { observedOn: "2026-06-01", value: 1 },
    { observedOn: "2026-06-29", value: 2 },
    { observedOn: "2026-06-30", value: 3 },
    { observedOn: "2026-07-31", value: 4 },
  ]);
  assert.deepEqual(result, [
    { observedOn: "2026-06-30", value: 3 },
    { observedOn: "2026-07-31", value: 4 },
  ]);
});

test("hybrid history keeps recent days and compacts older months", () => {
  const result = recentDailyAndMonthly([
    { observedOn: "2025-12-30", value: 1 },
    { observedOn: "2025-12-31", value: 2 },
    { observedOn: "2026-07-30", value: 3 },
    { observedOn: "2026-07-31", value: 4 },
  ], "2026-08-22");
  assert.deepEqual(result.map((point) => point.value), [2, 3, 4]);
});
