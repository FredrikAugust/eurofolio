import assert from "node:assert/strict";
import test from "node:test";

import { percentageChange, pointsInRange, rangeStart } from "@/app/portfolio-period";

test("chart ranges clamp month-end dates instead of overflowing", () => {
  assert.equal(rangeStart("2026-03-31", "1M"), "2026-02-28");
  assert.equal(rangeStart("2024-03-31", "1M"), "2024-02-29");
  assert.equal(rangeStart("2026-05-31", "3M"), "2026-02-28");
  assert.equal(rangeStart("2026-08-22", "1Y"), "2025-08-22");
  assert.equal(rangeStart("2026-08-22", "ALL"), null);
});

test("short ranges retain the observation immediately before the boundary", () => {
  const points = [
    { time: "2026-08-14", value: 100 },
    { time: "2026-08-17", value: 105 },
    { time: "2026-08-18", value: 110 },
  ];
  assert.deepEqual(pointsInRange(points, "1D", "2026-08-16"), points);
  assert.ok(Math.abs((percentageChange(points) ?? 0) - 10) < Number.EPSILON * 100);
});
