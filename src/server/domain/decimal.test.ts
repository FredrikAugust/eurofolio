import assert from "node:assert/strict";
import test from "node:test";

import {
  add,
  canonicalDecimal,
  divide,
  formatDecimal,
  multiply,
} from "@/server/domain/decimal";

test("canonical decimals normalize without floating-point artifacts", () => {
  assert.equal(canonicalDecimal("12.3400"), "12.34");
  assert.equal(canonicalDecimal("-0.00"), "0");
  assert.equal(add("0.1", "0.2"), "0.3");
  assert.equal(multiply("0.333333333333333333", "3"), "0.999999999999999999");
  assert.equal(divide("1", "3"), "0.333333333333333333");
});

test("invalid decimal forms and excess scale are rejected", () => {
  for (const value of ["01", "1e2", "NaN", "Infinity", ".5", "1.1234567890123456789"]) {
    assert.throws(() => canonicalDecimal(value));
  }
});

test("display rounding is half-even", () => {
  assert.equal(formatDecimal("2.345", 2), "2.34");
  assert.equal(formatDecimal("2.355", 2), "2.36");
  assert.equal(formatDecimal("-2.345", 2), "-2.34");
});
