import Decimal from "decimal.js-light";

export const MAX_DECIMAL_SCALE = 18;
export const MAX_DECIMAL_DIGITS = 36;

Decimal.set({
  precision: 48,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -100,
  toExpPos: 100,
});

const decimalPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export class DecimalInputError extends Error {
  readonly code = "INVALID_DECIMAL";

  constructor(message: string) {
    super(message);
    this.name = "DecimalInputError";
  }
}

export function canonicalDecimal(input: string): string {
  if (!decimalPattern.test(input)) {
    throw new DecimalInputError(
      "Use plain decimal notation without leading zeroes or exponent notation.",
    );
  }

  const unsigned = input.startsWith("-") ? input.slice(1) : input;
  const [integer, fraction = ""] = unsigned.split(".");
  if (fraction.length > MAX_DECIMAL_SCALE) {
    throw new DecimalInputError(`Decimal scale may not exceed ${MAX_DECIMAL_SCALE}.`);
  }
  if (`${integer}${fraction}`.length > MAX_DECIMAL_DIGITS) {
    throw new DecimalInputError(
      `Decimal precision may not exceed ${MAX_DECIMAL_DIGITS} digits.`,
    );
  }

  const normalized = new Decimal(input).toFixed();
  return normalized === "-0" ? "0" : normalized;
}

export function positiveDecimal(input: string): string {
  const value = canonicalDecimal(input);
  if (new Decimal(value).lte(0)) {
    throw new DecimalInputError("Value must be greater than zero.");
  }
  return value;
}

export function add(left: string, right: string): string {
  return canonicalDecimal(new Decimal(left).plus(right).toFixed());
}

export function subtract(left: string, right: string): string {
  return canonicalDecimal(new Decimal(left).minus(right).toFixed());
}

export function multiply(left: string, right: string): string {
  return canonicalDecimal(new Decimal(left).times(right).toFixed());
}

export function divide(left: string, right: string): string {
  if (new Decimal(right).isZero()) {
    throw new DecimalInputError("Cannot divide by zero.");
  }
  return canonicalDecimal(new Decimal(left).dividedBy(right).toDecimalPlaces(MAX_DECIMAL_SCALE).toFixed());
}

export function compare(left: string, right: string): number {
  return new Decimal(left).comparedTo(right);
}

export function formatDecimal(
  value: string,
  fractionDigits = 2,
): string {
  canonicalDecimal(value);
  return new Decimal(value).toDecimalPlaces(fractionDigits, Decimal.ROUND_HALF_EVEN).toFixed(
    fractionDigits,
  );
}
