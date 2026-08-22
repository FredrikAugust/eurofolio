export function latestObservationPerMonth<T extends { observedOn: string }>(
  observations: readonly T[],
): T[] {
  const latest = new Map<string, T>();
  for (const observation of observations) {
    const month = observation.observedOn.slice(0, 7);
    const current = latest.get(month);
    if (!current || observation.observedOn > current.observedOn) {
      latest.set(month, observation);
    }
  }
  return [...latest.values()].sort((left, right) =>
    left.observedOn.localeCompare(right.observedOn),
  );
}

/** Keep recent trading days for useful short-range charts, then compact older data. */
export function recentDailyAndMonthly<T extends { observedOn: string }>(
  observations: readonly T[],
  endOn: string,
  recentDays = 120,
): T[] {
  const cutoff = new Date(`${endOn}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - recentDays);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const recent = observations.filter((observation) => observation.observedOn >= cutoffDate);
  const older = latestObservationPerMonth(
    observations.filter((observation) => observation.observedOn < cutoffDate),
  );
  return [...older, ...recent].sort((left, right) => left.observedOn.localeCompare(right.observedOn));
}
