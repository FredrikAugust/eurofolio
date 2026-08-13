"use client";

import { useEffect, useRef } from "react";
import type { Time } from "lightweight-charts";

import type { PortfolioHistoryPoint } from "@/server/services/portfolio-query";

type Props = { data: PortfolioHistoryPoint[]; colors: string[] };

const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function PortfolioChart({ data, colors }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const detail = detailRef.current;
    if (!container || !detail || data.length < 2) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void import("lightweight-charts").then(({ AreaSeries, ColorType, CrosshairMode, createChart }) => {
      if (disposed) return;
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

      const cumulativeByAccount = accountOrder.map((account, accountIndex) => ({
        account,
        values: data.map((point) => ({
          time: point.time as Time,
          value: accountOrder.slice(0, accountIndex + 1).reduce((sum, current) => {
            const value = point.accounts.find((candidate) => candidate.accountId === current.accountId)?.value;
            return sum + (value ?? 0);
          }, 0),
        })),
      }));

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
        const date = new Intl.DateTimeFormat("en-IE", { month: "short", year: "numeric" })
          .format(new Date(`${point.time}T12:00:00Z`));
        detail.textContent = `${date} · ${accountOrder.map((account) => {
          const value = point.accounts.find((candidate) => candidate.accountId === account.accountId)?.value ?? 0;
          return `${account.accountName} ${eur.format(value)}`;
        }).join(" · ")}`;
      });

      const resizeObserver = new ResizeObserver(([entry]) => {
        chart.applyOptions({
          width: Math.floor(entry.contentRect.width),
          height: entry.contentRect.width < 640 ? 220 : 310,
        });
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
  }, [colors, data]);

  const accounts = data.at(-1)?.accounts ?? [];
  return (
    <div className="chart-wrap">
      <div className="chart-legend" aria-label="Account legend">
        {accounts.map((account, index) => (
          <span key={account.accountId}><i style={{ backgroundColor: colors[index % colors.length] }} />{account.accountName}</span>
        ))}
      </div>
      <div className="portfolio-chart" ref={containerRef} aria-label="Stacked portfolio value by account" />
      <div className="chart-detail" ref={detailRef} aria-live="polite">Move across the chart for account values</div>
    </div>
  );
}
