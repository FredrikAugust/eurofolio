type Point = { time: string; value: number };

type SparklineProps = {
  points: Point[];
  label: string;
  color?: string;
  className?: string;
};

function shortDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short" }).format(date);
}

export function Sparkline({ points, label, color = "currentColor", className = "" }: SparklineProps) {
  const valid = points.filter((point) => Number.isFinite(point.value));
  if (valid.length === 0) {
    return <span className={`sparkline-empty ${className}`} aria-label={`${label}: no observations`}>No trace</span>;
  }

  const width = 160;
  const height = 34;
  const baseline = height - 3;

  if (valid.length === 1) {
    return (
      <span className={`sparkline-wrap sparkline-start ${className}`} style={{ color }} role="img" aria-label={`${label}: one observation on ${shortDate(valid[0].time)}`}>
        <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
          <line x1="0" y1={baseline} x2={width} y2={baseline} className="sparkline-baseline" />
          <circle cx={width - 4} cy={baseline} r="2.8" className="sparkline-endpoint" />
        </svg>
        <span className="sparkline-meta"><small>{shortDate(valid[0].time)}</small><b>Start</b></span>
      </span>
    );
  }

  const values = valid.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || Math.max(Math.abs(maximum) * 0.02, 1);
  const coordinates = valid.map((point, index) => ({
    x: (index / (valid.length - 1)) * width,
    y: 2 + ((maximum - point.value) / spread) * (height - 8),
  }));
  const polyline = coordinates.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `M${coordinates.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" L")} L${width},${baseline} L0,${baseline} Z`;
  const comparisonPoint = valid.find((point) => point.value !== 0);
  const change = comparisonPoint ? ((valid.at(-1)?.value ?? 0) / comparisonPoint.value - 1) * 100 : null;
  const direction = change === null || change === 0 ? "flat" : change > 0 ? "positive" : "negative";
  const changeLabel = change === null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
  const firstDate = shortDate(valid[0].time);
  const lastDate = shortDate(valid.at(-1)!.time);

  return (
    <span className={`sparkline-wrap ${className}`} style={{ color }} role="img" aria-label={`${label}: ${valid.length} observations from ${firstDate} to ${lastDate}, ${change === null ? "change unavailable" : `${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)} percent`}`}>
      <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <line x1="0" y1={baseline} x2={width} y2={baseline} className="sparkline-baseline" />
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} className="sparkline-midline" />
        <path d={area} className="sparkline-area" />
        <polyline points={polyline} className="sparkline-line" />
        <circle cx={coordinates.at(-1)!.x} cy={coordinates.at(-1)!.y} r="2.4" className="sparkline-endpoint" />
      </svg>
      <span className="sparkline-meta"><small>{valid.length} obs</small><b className={direction}>{changeLabel}</b></span>
    </span>
  );
}
