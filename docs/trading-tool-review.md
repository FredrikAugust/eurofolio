# Trading-tool review

Review date: 2026-08-22

## Review method

The review covered every application route and component, the ledger and valuation domain,
market adapters, persistence, authentication, MCP tools, tests, and scheduled/backfill jobs. It
also compared Eurofolio with the product patterns and primary references collected in
[`product-opportunities.md`](./product-opportunities.md). The product should remain a calm,
private portfolio tool—not drift into order execution or a noisy market terminal.

## Ten issues, in priority order

1. **The “1D” comparison used yesterday's calendar date, not the previous market close.**
   Before the daily quote arrived, and throughout weekends, both sides selected the same
   last-known price and showed 0%. **Fixed:** 1D now compares the latest two actual price
   observation dates.
2. **The only price refresh ran at 05:30 UTC, before European and US sessions.** The dashboard
   therefore spent most of the day labeling the prior close as today's performance.
   **Fixed:** the weekday job now runs at 22:15 UTC, after the US close.
3. **Historical backfill discarded every daily observation except month-end.** That made 1M
   and 3M inspection visually sparse and made a genuine recent-performance chart impossible.
   **Fixed:** backfill retains 120 days of daily closes and compacts older history monthly.
4. **The main chart always showed lifetime history.** A trader checking a recent drawdown had
   no way to isolate it. **Fixed:** accessible 1M, 3M, 1Y, and ALL controls now update the chart.
5. **The chart's interaction was effectively hidden.** Crosshair values existed, but the UI
   only said “move” and offered no visible control. **Fixed:** the period toolbar makes the
   interactive surface explicit and the prompt now includes touch.
6. **The headline period figures are value changes, not investment returns.** Deposits and
   withdrawals can masquerade as performance. **Next:** calculate TWR and show net flows beside
   absolute gain; do not label raw balance change as return.
7. **There is no change attribution.** The owner cannot separate market movement, FX,
   dividends, fees, taxes, or contributions. **Next:** add a reconciled return bridge whose
   parts sum to the period change.
8. **There is no benchmark or risk context.** A positive number does not say whether the
   portfolio beat a passive alternative, while drawdown and volatility are absent.
   **Next:** add one configurable EUR-normalized benchmark, max drawdown, and distance from high.
9. **Holdings lack cost basis and actionable P/L.** Quantity, current price, and weight answer
   “what do I own?” but not average cost, unrealized gain, realized gain, or today's contribution.
   **Next:** derive lot-aware cost basis from the ledger and show P/L at holding and account scope.
10. **Data health is scattered rather than decision-oriented.** Stale badges and refresh runs
    exist, but the dashboard does not say which return or chart is unreliable, and cron failures
    have no alert path. **Next:** attach completeness to each metric and surface the last refresh,
    affected instruments, consecutive failures, and a retry/backfill action.

## Product guardrails

- Prefer returns, attribution, risk, and data quality over news, sentiment, or trade ideas.
- Keep mutations in the ledger/MCP workflow; analytics in the UI should remain inspectable and
  read-only.
- Never imply real-time data: label the effective market close and source latency.
- Preserve exact decimal accounting and disclose incomplete calculations instead of silently
  filling gaps.
