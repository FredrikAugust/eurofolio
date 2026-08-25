export type PortfolioRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

export const portfolioRanges: PortfolioRange[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

export function rangeStart(end: string, range: PortfolioRange): string | null {
  if (range === "ALL") return null;
  const date = new Date(`${end}T00:00:00Z`);
  if (range === "1D" || range === "1W") {
    date.setUTCDate(date.getUTCDate() - (range === "1D" ? 1 : 7));
    return date.toISOString().slice(0, 10);
  }
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - (range === "1M" ? 1 : range === "3M" ? 3 : 12));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return date.toISOString().slice(0, 10);
}

export function pointsInRange<T extends { time: string }>(
  points: readonly T[],
  range: PortfolioRange,
  exactStart?: string,
): T[] {
  if (points.length === 0 || range === "ALL") return [...points];
  const start = exactStart ?? rangeStart(points.at(-1)!.time, range);
  if (!start) return [...points];

  const firstOnOrAfter = points.findIndex((point) => point.time >= start);
  if (firstOnOrAfter === -1) return points.slice(-1);
  const anchor = points[firstOnOrAfter].time === start
    ? firstOnOrAfter
    : Math.max(0, firstOnOrAfter - 1);
  return points.slice(anchor);
}

export function percentageChange(points: readonly { value: number }[]): number | null {
  const first = points[0]?.value;
  const last = points.at(-1)?.value;
  if (first === undefined || last === undefined || first === 0 || points.length < 2) return null;
  return ((last / first) - 1) * 100;
}
