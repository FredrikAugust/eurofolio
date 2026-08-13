# Eurofolio product opportunities

Research date: 2026-08-13

## Product position

Eurofolio should not become a smaller clone of a broker aggregator. Its strongest position is a private, single-owner investment register that is fast to read, exact enough to trust, and fully controllable through MCP. The product should answer three questions in seconds:

1. What do I own, where, and what is it worth in EUR?
2. Why did the value change?
3. Am I still following the strategy I intended?

## Patterns worth borrowing

### Portfolio Performance: measurement and intent

Portfolio Performance treats transaction history as the basis for serious performance accounting. It exposes TWR/TTWROR and IRR, risk indicators such as drawdown and volatility, contribution analysis, target allocations, and rebalancing deltas. Its taxonomy system lets one holding contribute to multiple analytical classifications.

Borrow:

- time-weighted and money-weighted returns at portfolio, account, and holding scope;
- contribution-versus-market decomposition;
- actual versus target allocation with concrete EUR drift;
- monthly return heatmaps and maximum-drawdown periods;
- user-defined classifications rather than one hard-coded asset-class field.

Do not borrow its configurable-widget complexity. Eurofolio should choose a strong default view and keep advanced analysis behind focused pages.

Sources: [Portfolio Performance](https://www.portfolio-performance.info/en/), [performance metrics](https://help.portfolio-performance.info/en/reference/view/reports/performance/), [taxonomies and rebalancing](https://help.portfolio-performance.info/en/reference/view/taxonomies/using-taxonomies/), [dashboard widgets](https://help.portfolio-performance.info/en/reference/view/reports/performance/dashboard/).

### Sharesight: explaining the return

Sharesight distinguishes capital gains, dividends, fees, and currency movement instead of presenting one opaque gain number. It also provides benchmark comparisons, contribution analysis, multi-currency valuation, diversity/exposure reports, future income, and drawdown reporting.

Borrow:

- a return bridge that explains the period change in EUR;
- explicit FX contribution for non-EUR holdings;
- benchmark comparison against one configurable ETF or index;
- income history and upcoming-income calendar;
- concentration views by account, asset class, currency, region, and sector.

Do not prioritize tax reports yet. Tax correctness is jurisdiction-specific and would widen the product substantially.

Sources: [Sharesight features](https://www.sharesight.com/features/), [investment performance](https://www.sharesight.com/uk/investment-portfolio-performance/), [dividend tracking](https://www.sharesight.com/us/dividend-tracker/), [report catalogue](https://www.sharesight.com/eu/pricing/).

### Ghostfolio: a calm daily-use layer

Ghostfolio combines multiple accounts with broad period shortcuts, static risk analysis, a mobile-first PWA, and optional Zen Mode. Its public model also includes richer asset profiles with country, sector, and underlying-holding weights.

Borrow:

- a compact period switcher: day, month, year-to-date, one year, and maximum;
- a portfolio health or X-ray page that identifies concentration and missing metadata;
- installable mobile behavior and a privacy mode for hiding balances in screenshots;
- a simple “what changed since last visit?” summary.

Avoid market mood, community, and news feeds. They add noise to a product whose advantage is clarity.

Source: [Ghostfolio official repository](https://github.com/ghostfolio/ghostfolio/blob/main/README.md).

### Snowball Analytics: future income and what-if tools

Snowball makes dividend income tangible with a calendar, annual forecast, planned-versus-current income, target allocations, and simple what-if substitutions.

Borrow later:

- a twelve-month income calendar;
- realized versus expected income;
- a lightweight “add €X” or “replace holding A with B” sandbox that never writes to the ledger.

Avoid dividend ratings and stock-selection signals. Eurofolio should explain the owner’s data, not recommend securities.

Source: [Snowball Analytics portfolio tracker](https://divtracker.snowball-analytics.com/us/stock-portfolio-tracker).

### Wealthfolio: planning and data-quality honesty

Wealthfolio now combines daily valuation series, TWR/MWR, drawdown, attribution, target allocation, goals, retirement simulation, and explicit data-quality flags. Its strongest pattern is that advanced results report when the source data is incomplete or unreliable.

Borrow:

- every calculated metric should carry a completeness state and explain missing observations;
- target allocation should produce an actionable buy/sell delta but remain read-only;
- one optional goal can turn the portfolio from a passive register into a planning tool;
- MCP should expose the same analytical results as the UI.

Avoid expanding into spending, budgeting, general net worth, and AI chat. MCP already provides the composable assistant surface without putting a chat product inside Eurofolio.

Sources: [Wealthfolio features](https://wealthfolio.app/features/), [performance metrics](https://wealthfolio.app/docs/concepts/performance-metrics/), [allocation targets](https://wealthfolio.app/docs/guide/allocation-targets/), [goals](https://wealthfolio.app/docs/guide/goals/).

## Recommended roadmap

### Now: make the numbers useful

1. **Return engine** — daily valuation series; TWR and XIRR; portfolio, account, and holding scopes; preset and custom periods.
2. **Change attribution** — contributions, withdrawals, realized gain, unrealized gain, income, fees, taxes, FX, and unexplained residual.
3. **Benchmark line** — one configurable benchmark converted to EUR and rebased to 100, shown beside portfolio TWR.
4. **Strategy targets** — target percentages by asset class/account/currency, current drift, and EUR needed to return to target.
5. **Data-quality scorecard** — gaps, stale observations, last successful refresh, and which metrics are affected.

### Next: reveal hidden exposure

6. **Income page** — dividends and interest by month, account, currency, and holding; upcoming payments only when sourced confidently.
7. **Classification model** — sector, geography, currency exposure, and user tags with weighted classifications for funds and ETFs.
8. **Fund/ETF look-through** — top underlying holdings and aggregate exposure, starting with manually supplied or free-source metadata.
9. **Daily brief through MCP** — “what changed, what is stale, what crossed a target, and what income arrived?”

### Later: planning without bloat

10. **Risk register** — current/max drawdown, volatility, concentration, and distance from all-time high.
11. **What-if sandbox** — hypothetical contribution or rebalance with no ledger mutation.
12. **One goal** — target amount/date and required monthly contribution, not a general budgeting system.

## Best next change

Build the return engine and change-attribution view together. Eurofolio already knows dated transactions, prices, FX, fees, taxes, dividends, and account ownership. Those features turn existing data into the answer currently missing from the dashboard: whether the portfolio grew because the investments performed, because more money was added, or because currencies moved.

The Overview should then gain one compact period row beneath the main value:

- portfolio TWR;
- absolute investment gain;
- net contributions;
- FX effect;
- benchmark delta;
- data completeness.

That is more valuable than adding more charts, more asset types, or broker connections.
