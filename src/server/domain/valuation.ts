import { compare, divide } from "@/server/domain/decimal";

export type Freshness = "current" | "stale" | "missing" | "manual";

export type DatedObservation = {
  observedOn: string;
  retrievedAt: string;
  provider: string;
  isManual: boolean;
};

export type SelectedObservation<T extends DatedObservation> = {
  observation: T | null;
  freshness: Freshness;
};

function daysBetween(left: string, right: string): number {
  const leftTime = Date.parse(`${left}T00:00:00.000Z`);
  const rightTime = Date.parse(`${right}T00:00:00.000Z`);
  return Math.floor((rightTime - leftTime) / 86_400_000);
}

export function selectObservation<T extends DatedObservation>(
  observations: readonly T[],
  valuationDate: string,
  staleAfterDays: number,
): SelectedObservation<T> {
  const eligible = observations
    .filter((observation) => observation.observedOn <= valuationDate)
    .sort(
      (left, right) =>
        right.observedOn.localeCompare(left.observedOn) ||
        Number(right.isManual) - Number(left.isManual) ||
        right.retrievedAt.localeCompare(left.retrievedAt),
    );
  const observation = eligible[0] ?? null;
  if (!observation) return { observation: null, freshness: "missing" };
  if (observation.isManual) return { observation, freshness: "manual" };
  return {
    observation,
    freshness:
      daysBetween(observation.observedOn, valuationDate) > staleAfterDays
        ? "stale"
        : "current",
  };
}

export type FxSelection = {
  rate: string;
  observedOn: string;
  provider: string;
  freshness: Freshness;
  isManual: boolean;
};

export function selectFxRate(
  currency: string,
  observations: readonly (DatedObservation & {
    quoteCurrency: string;
    rate: string;
  })[],
  valuationDate: string,
  staleAfterDays: number,
): FxSelection | null {
  if (currency === "EUR") {
    return {
      rate: "1",
      observedOn: valuationDate,
      provider: "identity",
      freshness: "current",
      isManual: false,
    };
  }
  const selected = selectObservation(
    observations.filter((observation) => observation.quoteCurrency === currency),
    valuationDate,
    staleAfterDays,
  );
  if (!selected.observation) return null;
  return {
    rate: selected.observation.rate,
    observedOn: selected.observation.observedOn,
    provider: selected.observation.provider,
    freshness: selected.freshness,
    isManual: selected.observation.isManual,
  };
}

export function nativeToEur(amount: string, foreignUnitsPerEur: string): string {
  if (compare(foreignUnitsPerEur, "0") <= 0) {
    throw new Error("FX rate must be greater than zero.");
  }
  return divide(amount, foreignUnitsPerEur);
}
