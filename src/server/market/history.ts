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
