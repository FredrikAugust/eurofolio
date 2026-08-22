# Eurofolio design system

## Product principle

Eurofolio is one private portfolio brief. It should answer, in order:

1. What is the portfolio worth and when were prices observed?
2. How has its value changed over a useful period?
3. Where is it held and how is it allocated?
4. What positions make up the result?

Anything that does not support those questions stays out of the interface.

## Visual hierarchy

- **Current value** is the only display-sized number.
- **Period changes** qualify the current value without becoming separate cards.
- **Performance** is the only large interactive chart.
- **Accounts and allocation** are compact supporting summaries.
- **Holdings** is the detailed register and final primary section.
- **Valuation gaps** appear only when data is incomplete.

The page does not repeat top holdings, duplicate history charts, expose MCP details, or use navigation for information already present below.

## Color

- Surface: `#fcfbf8`
- Page: `#f4f3ef`
- Text: `#141515`
- Secondary text: `#686964`
- Rules: `#d8d7d1`
- Positive: `#176b4d`
- Negative: `#b43f24`
- Interactive accent: `#1748ba`

Color communicates direction or interaction. It is not a decorative fill.

## Typography

The system sans-serif carries names and values without requiring a runtime font download. The system monospace carries dates, labels, source status, and chart annotations. Financial values use tabular lining figures. Tight display tracking is reserved for the consolidated value; supporting numbers remain compact and readable.

## Layout

The portfolio is a single surface capped at 84rem. It uses rules, spacing, and alignment rather than cards, shadows, radii, or ornamental axes. Desktop opens with a two-column value/change area. Below 900px it becomes one column. Below 680px, the holdings table becomes disclosure rows and the account/allocation summaries stack.

## Interaction

The chart exposes `1M`, `3M`, `1Y`, and `ALL` periods. Unavailable periods are disabled rather than showing observations outside the chosen window. Crosshair details work with pointer and touch. Frequently used financial surfaces do not animate on arrival; buttons receive only brief press feedback and reduced-motion preferences are respected.

## Data honesty

The interface always shows the effective observation date and whether the valuation is complete. Missing data is explicit. Delayed data must never look real-time, and raw balance changes must not be presented as time-weighted investment returns.
