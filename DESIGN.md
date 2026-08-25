# Eurofolio design system

## Product principle

Eurofolio is one private portfolio brief. A visitor should answer these five questions without interpretation:

1. What is my portfolio worth?
2. What changed over the period I chose?
3. Is that performance, or does it include cash movements?
4. Which holdings matter most, and how did each move?
5. Are these numbers current and complete?

Anything that does not support those questions stays out of the interface.

## Visual hierarchy

- **Current value** is the only display-sized number.
- **One period control** governs the balance change, balance history, and every holding's price movement.
- **Portfolio balance** is the only large interactive chart; account performance is not charted.
- **Holdings** shows only name, value, share, and selected-period price movement at rest. Quantity, price, observation date, and source are disclosed on demand.
- **Accounts and asset mix** are compact supporting summaries after the holdings register.
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

The portfolio is a single full-width surface. It uses rules, spacing, and alignment rather than cards, shadows, radii, or ornamental axes. The current value, freshness status, shared period control, balance change, and balance history form one overview. Below 900px the summary becomes one column. Below 680px, the period selector becomes two rows, holdings reflow into two-line disclosure rows, and supporting summaries stack.

## Interaction

The page exposes `1D`, `1W`, `1M`, `3M`, `1Y`, and `ALL` periods in one control. The selection updates the total balance change, total-balance chart, and every holding's price change. Holding rows expand with native disclosure behavior. Crosshair details work with pointer and touch. Frequently used financial surfaces do not animate on arrival; buttons receive only brief press feedback and reduced-motion preferences are respected.

## Data honesty

The interface always shows the effective observation date and whether the valuation is complete. Missing data is explicit. Delayed data must never look real-time, and raw balance changes must not be presented as time-weighted investment returns.
