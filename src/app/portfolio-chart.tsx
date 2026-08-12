"use client";

import { useEffect, useRef } from "react";
import type { Time } from "lightweight-charts";

import type { PortfolioHistoryPoint } from "@/server/services/portfolio-query";

export function PortfolioChart({ data }: { data: PortfolioHistoryPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.length < 2) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void import("lightweight-charts").then(({ AreaSeries, ColorType, createChart }) => {
      if (disposed) return;
      const chart = createChart(container, {
        width: container.clientWidth,
        height: 280,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#667085",
          attributionLogo: false,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: "rgba(16, 24, 40, 0.07)" },
        },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false },
        crosshair: {
          vertLine: { color: "rgba(18, 120, 83, 0.35)" },
          horzLine: { visible: false },
        },
      });
      const series = chart.addSeries(AreaSeries, {
        lineColor: "#127853",
        topColor: "rgba(18, 120, 83, 0.28)",
        bottomColor: "rgba(18, 120, 83, 0.02)",
        lineWidth: 2,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });
      series.setData(data.map(({ time, value }) => ({ time: time as Time, value })));
      chart.timeScale().fitContent();

      const resizeObserver = new ResizeObserver(([entry]) => {
        chart.applyOptions({ width: Math.floor(entry.contentRect.width) });
      });
      resizeObserver.observe(container);
      cleanup = () => {
        resizeObserver.disconnect();
        chart.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [data]);

  return <div className="portfolio-chart" ref={containerRef} aria-label="Portfolio value history chart" />;
}
