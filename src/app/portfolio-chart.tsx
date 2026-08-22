"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Time } from "lightweight-charts";

import type { PortfolioHistoryPoint } from "@/server/services/portfolio-query";

type Props = { data: PortfolioHistoryPoint[]; colors: string[] };
type Range = "1M" | "3M" | "1Y" | "ALL";

const ranges: Range[] = ["1M", "3M", "1Y", "ALL"];

export function rangeStart(end: string, range: Range): string | null {
  if (range === "ALL") return null;
  const date = new Date(`${end}T00:00:00Z`);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - (range === "1M" ? 1 : range === "3M" ? 3 : 12));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return date.toISOString().slice(0, 10);
}

function dataInRange(data: PortfolioHistoryPoint[], range: Range): PortfolioHistoryPoint[] {
  const end = data.at(-1)?.time;
  if (!end) return [];
  const start = rangeStart(end, range);
  return start ? data.filter((point) => point.time >= start) : data;
}

const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

async function initializeChart(
  container: HTMLDivElement,
  detail: HTMLDivElement,
  data: PortfolioHistoryPoint[],
  colors: string[],
) {
  const { AreaSeries, ColorType, CrosshairMode, createChart } = await import("lightweight-charts");
  const accountOrder = data.at(-1)?.accounts ?? [];
  const chart = createChart(container, {
    width: container.clientWidth,
    height: container.clientWidth < 640 ? 220 : 310,
    layout: {
      background: { type: ColorType.Solid, color: "transparent" },
      textColor: "#69717b",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontSize: 11,
      attributionLogo: false,
    },
    grid: {
      vertLines: { visible: false },
      horzLines: { color: "#e6e9ec", style: 1 },
    },
    localization: { priceFormatter: (value: number) => eur.format(value) },
    rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.03 } },
    timeScale: { borderVisible: false, rightOffset: 0, fixLeftEdge: true, fixRightEdge: true },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: "#9ca5af", labelVisible: false, style: 2 },
      horzLine: { visible: false, labelVisible: false },
    },
  });

  const cumulativeByAccount = accountOrder.map((account) => ({
    account,
    values: [] as { time: Time; value: number }[],
  }));
  for (const point of data) {
    const valuesByAccount = new Map(
      point.accounts.map((account) => [account.accountId, account.value ?? 0]),
    );
    let cumulative = 0;
    cumulativeByAccount.forEach(({ account, values }) => {
      cumulative += valuesByAccount.get(account.accountId) ?? 0;
      values.push({ time: point.time as Time, value: cumulative });
    });
  }

  for (let index = cumulativeByAccount.length - 1; index >= 0; index -= 1) {
    const { values } = cumulativeByAccount[index];
    const color = colors[index % colors.length];
    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}d9`,
      bottomColor: `${color}d9`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });
    series.setData(values);
  }
  chart.timeScale().fitContent();

  chart.subscribeCrosshairMove((parameter) => {
    if (!parameter.time || parameter.point === undefined) {
      detail.textContent = "Move across the chart for account values";
      return;
    }
    const point = data.find((candidate) => candidate.time === String(parameter.time));
    if (!point) return;
    const valuesByAccount = new Map(
      point.accounts.map((account) => [account.accountId, account.value ?? 0]),
    );
    const date = new Intl.DateTimeFormat("en-IE", { month: "short", year: "numeric" })
      .format(new Date(`${point.time}T12:00:00Z`));
    detail.textContent = `${date} · ${accountOrder.map((account) =>
      `${account.accountName} ${eur.format(valuesByAccount.get(account.accountId) ?? 0)}`
    ).join(" · ")}`;
  });

  const resizeObserver = new ResizeObserver(([entry]) => {
    chart.applyOptions({
      width: Math.floor(entry.contentRect.width),
      height: entry.contentRect.width < 640 ? 220 : 310,
    });
  });
  resizeObserver.observe(container);
  return () => {
    resizeObserver.disconnect();
    chart.remove();
  };
}

export function PortfolioChart({ data, colors }: Props) {
  const [range, setRange] = useState<Range>(() => dataInRange(data, "3M").length >= 2 ? "3M" : "ALL");
  const containerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const visibleData = useMemo(() => dataInRange(data, range), [data, range]);
  const availableRanges = useMemo(() => new Set(
    ranges.filter((option) => dataInRange(data, option).length >= 2),
  ), [data]);

  useEffect(() => {
    const container = containerRef.current;
    const detail = detailRef.current;
    if (!container || !detail || visibleData.length < 2) return;
    let disposed = false;
    let started = false;
    let cleanup: (() => void) | undefined;
    let intersectionObserver: IntersectionObserver | undefined;

    const renderChart = () => {
      if (started) return;
      started = true;
      intersectionObserver?.disconnect();
      void initializeChart(container, detail, visibleData, colors).then((dispose) => {
        if (disposed) dispose();
        else cleanup = dispose;
      });
    };

    if ("IntersectionObserver" in window) {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) renderChart();
        },
        { rootMargin: "240px 0px" },
      );
      intersectionObserver.observe(container);
    } else {
      renderChart();
    }

    return () => {
      disposed = true;
      intersectionObserver?.disconnect();
      cleanup?.();
    };
  }, [colors, visibleData]);

  const accounts = data.at(-1)?.accounts ?? [];
  return (
    <div className="chart-wrap">
      <div className="chart-toolbar">
        <div className="chart-legend" aria-label="Account legend">
          {accounts.map((account, index) => (
            <span key={account.accountId}><i style={{ backgroundColor: colors[index % colors.length] }} />{account.accountName}</span>
          ))}
        </div>
        <div className="chart-ranges" aria-label="Chart period">
          {ranges.map((option) => <button type="button" aria-pressed={range === option} disabled={!availableRanges.has(option)} onClick={() => setRange(option)} key={option}>{option}</button>)}
        </div>
      </div>
      <div className="portfolio-chart" ref={containerRef} aria-label={`Stacked portfolio value by account, ${range} range`} />
      <div className="chart-detail" ref={detailRef} aria-live="polite">Move or tap across the chart for account values</div>
    </div>
  );
}
