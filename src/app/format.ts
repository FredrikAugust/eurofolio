import { formatDecimal } from "@/server/domain/decimal";

export function money(value: string | null, currency = "EUR"): string {
  if (value === null) return "Not valued";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(formatDecimal(value, 2)));
}

export function quantity(value: string, maximumFractionDigits = 4): string {
  return new Intl.NumberFormat("en-IE", { maximumFractionDigits }).format(Number(value));
}

export function percent(part: string | number, total: string | number): string {
  const denominator = Number(total);
  return denominator ? `${((Number(part) / denominator) * 100).toFixed(1)}%` : "0.0%";
}

export function displayDate(value: string, stacked = false): string | string[] {
  const date = new Date(`${value}T12:00:00Z`);
  if (stacked) {
    return [
      new Intl.DateTimeFormat("en-IE", { day: "numeric" }).format(date),
      new Intl.DateTimeFormat("en-IE", { month: "short" }).format(date),
      new Intl.DateTimeFormat("en-IE", { year: "numeric" }).format(date),
    ];
  }
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function freshnessLabel(value: string): string {
  return value === "manual" ? "Manual" : value[0].toUpperCase() + value.slice(1);
}

export function priceSourceLabel(provider: string | null, freshness: string): string {
  if (freshness === "manual" && provider === "manual") return "Recorded override";
  return provider ?? "No source";
}
