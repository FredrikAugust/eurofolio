import type { PortfolioHistoryPoint } from "@/server/services/portfolio-query";

export function PortfolioBackdrop({ points }: { points: PortfolioHistoryPoint[] }) {
  const complete = points.filter((point) => point.complete && Number.isFinite(point.value));
  const width = 1000;
  const height = 220;
  const floor = height - 8;

  if (complete.length < 2) {
    return (
      <div className="portfolio-backdrop is-starting" aria-hidden="true">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <line x1="0" y1={floor} x2={width} y2={floor} className="portfolio-backdrop-baseline" />
          {complete.length === 1 ? <circle cx={width - 8} cy={floor} r="4" className="portfolio-backdrop-point" /> : null}
        </svg>
        <span>{complete.length === 1 ? "Complete history starts here" : "Awaiting first complete valuation"}</span>
      </div>
    );
  }

  const values = complete.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.18, maximum * 0.025, 1);
  const low = minimum - padding;
  const high = maximum + padding;
  const spread = high - low || 1;
  const coordinates = complete.map((point, index) => ({
    x: (index / (complete.length - 1)) * width,
    y: 8 + ((high - point.value) / spread) * (height - 24),
  }));
  const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${floor} L0,${floor} Z`;
  const last = coordinates.at(-1)!;

  return (
    <div className="portfolio-backdrop" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="portfolio-value-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1748ba" stopOpacity="0.16" />
            <stop offset="1" stopColor="#1748ba" stopOpacity="0.015" />
          </linearGradient>
        </defs>
        <line x1="0" y1={floor} x2={width} y2={floor} className="portfolio-backdrop-baseline" />
        <path d={areaPath} fill="url(#portfolio-value-wash)" />
        <path d={linePath} className="portfolio-backdrop-line" />
        <circle cx={last.x} cy={last.y} r="4" className="portfolio-backdrop-point" />
      </svg>
      <span>{complete.length} complete monthly observations</span>
    </div>
  );
}
