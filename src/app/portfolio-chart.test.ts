import assert from "node:assert/strict";
import test from "node:test";

import { rangeStart } from "@/app/portfolio-chart";

test("chart ranges clamp month-end dates instead of overflowing", () => {
  assert.equal(rangeStart("2026-03-31", "1M"), "2026-02-28");
  assert.equal(rangeStart("2024-03-31", "1M"), "2024-02-29");
  assert.equal(rangeStart("2026-05-31", "3M"), "2026-02-28");
  assert.equal(rangeStart("2026-08-22", "1Y"), "2025-08-22");
  assert.equal(rangeStart("2026-08-22", "ALL"), null);
});
