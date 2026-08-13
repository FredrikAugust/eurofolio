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

function isPreferredObservation<T extends DatedObservation>(candidate: T, current: T): boolean {
  return (
    candidate.observedOn > current.observedOn ||
    (candidate.observedOn === current.observedOn && candidate.isManual && !current.isManual) ||
    (candidate.observedOn === current.observedOn &&
      candidate.isManual === current.isManual &&
      candidate.retrievedAt > current.retrievedAt)
  );
}

function selectMatchingObservation<T extends DatedObservation>(
  observations: readonly T[],
  valuationDate: string,
  matches: (observation: T) => boolean,
): T | null {
  let selected: T | null = null;
  for (const observation of observations) {
    if (
      observation.observedOn <= valuationDate &&
      matches(observation) &&
      (!selected || isPreferredObservation(observation, selected))
    ) {
      selected = observation;
    }
  }
  return selected;
}

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
  const observation = selectMatchingObservation(observations, valuationDate, () => true);
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
  const observation = selectMatchingObservation(
    observations,
    valuationDate,
    (candidate) => candidate.quoteCurrency === currency,
  );
  if (!observation) return null;
  const freshness = observation.isManual
    ? "manual"
    : daysBetween(observation.observedOn, valuationDate) > staleAfterDays
      ? "stale"
      : "current";
  return {
    rate: observation.rate,
    observedOn: observation.observedOn,
    provider: observation.provider,
    freshness,
    isManual: observation.isManual,
  };
}

export function nativeToEur(amount: string, foreignUnitsPerEur: string): string {
  if (compare(foreignUnitsPerEur, "0") <= 0) {
    throw new Error("FX rate must be greater than zero.");
  }
  return divide(amount, foreignUnitsPerEur);
}
