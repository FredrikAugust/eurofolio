type Point = { time: string; value: number };

type SparklineProps = {
  points: Point[];
  label: string;
  color?: string;
  className?: string;
};

export function Sparkline({ points, label, color = "currentColor", className = "" }: SparklineProps) {
  const valid = points.filter((point) => Number.isFinite(point.value));
  if (valid.length === 0) {
    return <span className={`sparkline-empty ${className}`} aria-label={`${label}: no observations`}>No trace</span>;
  }
  if (valid.length === 1) {
    return (
      <svg className={`sparkline sparkline-start ${className}`} viewBox="0 0 128 30" role="img" aria-label={`${label}: one observation`}>
        <title>{label}</title>
        <line x1="0" y1="23" x2="128" y2="23" className="sparkline-baseline" />
        <circle cx="124" cy="23" r="2.6" className="sparkline-start-point" />
      </svg>
    );
  }

  const width = 128;
  const height = 30;
  const values = valid.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || 1;
  const coordinates = valid.map((point, index) => {
    const x = (index / (valid.length - 1)) * width;
    const y = height - 2 - ((point.value - minimum) / spread) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const change = ((valid.at(-1)?.value ?? 0) / valid[0].value - 1) * 100;

  return (
    <svg className={`sparkline ${className}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}: ${valid.length} observations, ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)} percent`}>
      <title>{label}</title>
      <line x1="0" y1={height - 1} x2={width} y2={height - 1} className="sparkline-baseline" />
      <polyline points={coordinates} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
