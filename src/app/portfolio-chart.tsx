"use client";

import { useEffect, useRef } from "react";
import type { Time } from "lightweight-charts";

import type { PortfolioRange } from "@/app/portfolio-period";

type PortfolioBalancePoint = { time: string; value: number };
type Props = { data: PortfolioBalancePoint[]; range: PortfolioRange };

const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

async function initializeChart(
  container: HTMLDivElement,
  detail: HTMLDivElement,
  data: PortfolioBalancePoint[],
) {
  const { AreaSeries, ColorType, CrosshairMode, createChart } = await import("lightweight-charts");
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

  const series = chart.addSeries(AreaSeries, {
    lineColor: "#1748ba",
    topColor: "rgba(23, 72, 186, 0.2)",
    bottomColor: "rgba(23, 72, 186, 0.01)",
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: true,
    priceFormat: { type: "price", precision: 0, minMove: 1 },
  });
  series.setData(data.map((point) => ({ time: point.time as Time, value: point.value })));
  chart.timeScale().fitContent();

  chart.subscribeCrosshairMove((parameter) => {
    if (!parameter.time || parameter.point === undefined) {
      detail.textContent = "Move across the chart for the portfolio balance";
      return;
    }
    const point = data.find((candidate) => candidate.time === String(parameter.time));
    if (!point) return;
    const date = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric" })
      .format(new Date(`${point.time}T12:00:00Z`));
    detail.textContent = `${date} · ${eur.format(point.value)}`;
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

export function PortfolioChart({ data, range }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const detail = detailRef.current;
    if (!container || !detail || data.length < 2) return;
    let disposed = false;
    let started = false;
    let cleanup: (() => void) | undefined;
    let intersectionObserver: IntersectionObserver | undefined;

    const renderChart = () => {
      if (started) return;
      started = true;
      intersectionObserver?.disconnect();
      void initializeChart(container, detail, data).then((dispose) => {
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
  }, [data]);

  return (
    <div className="chart-wrap">
      <div className="portfolio-chart" ref={containerRef} role="img" aria-label={`Total portfolio balance in EUR, ${range} range`} />
      <div className="chart-detail" ref={detailRef} aria-live="polite">Move or tap across the chart for the portfolio balance</div>
    </div>
  );
}
