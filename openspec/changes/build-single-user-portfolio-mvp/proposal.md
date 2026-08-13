## Why

The owner needs one fast, private view of investments held across several accounts without logging into each provider or maintaining broker integrations. A purpose-built, single-user application can keep the operating surface small while exposing the portfolio to trusted agents through MCP.

## What Changes

- Add a single-owner portfolio ledger for accounts, instruments, and transactions.
- Preserve native transaction and instrument currencies while reporting all portfolio totals in EUR.
- Store delayed/end-of-day security prices and daily EUR foreign-exchange observations with provenance and timestamps.
- Add provider adapters, beginning with broad free market data and ECB reference rates, plus manual price overrides.
- Add a fast, server-first, mobile-first dashboard organized around overview, holdings, activity, and data-quality workflows, with account totals, allocation, freshness, and an account-stacked portfolio chart.
- Add an authenticated, stateless Streamable HTTP MCP server as the only programmatic integration surface, including portfolio reads and ledger writes.
- Keep portfolio reads and writes direct-to-database; do not add a general portfolio REST API, broker OAuth, background workers, or realtime quotes. Better Auth's standard route is the sole non-MCP API exception and handles authentication only.
- Optimize the first vertical slice for minimal dependencies, client JavaScript, build memory, query count, and cold-start work.

### Smallest useful vertical slice

One owner can use MCP to create an account, register a listed instrument, record buy/sell/cash transactions, refresh daily prices and EUR exchange rates, and see current EUR-valued holdings in the web dashboard.

### Non-goals

- Multiple users, households, roles, or tenant isolation.
- Direct broker connections or credential storage.
- Intraday/realtime prices, trading, order placement, or investment advice.
- Tax filing, jurisdiction-specific tax lots, advanced performance attribution, budgeting, or bank synchronization.
- Public write APIs other than authenticated MCP tools.

### Primary risks

- **Financial correctness:** rounding, FX direction, date alignment, splits, and partial sales can corrupt valuations if the ledger rules are vague.
- **Market data:** free quote sources can be incomplete, rate-limited, delayed, or discontinued; every observation needs provenance and a manual fallback.
- **Privacy:** MCP write tools expose sensitive financial data and require strict bearer-token authentication, redacted logs, and bounded inputs.
- **Performance:** charting and ORM dependencies can inflate bundles or local build memory; the UI must remain server-first and query paths indexed.

## Capabilities

### New Capabilities

- `portfolio-ledger`: Single-owner accounts, instruments, cash flows, and investment transactions with deterministic holdings.
- `eur-valuation`: Native-currency preservation and date-aware EUR conversion with explicit precision rules.
- `market-data`: Delayed/end-of-day security prices, ECB FX observations, provider provenance, caching, freshness, and manual overrides.
- `portfolio-dashboard`: Server-rendered current holdings, totals, allocation, and stale-data indicators.
- `portfolio-mcp`: Authenticated stateless MCP tools and resources for all programmatic portfolio reads and writes.

### Modified Capabilities

None.

## Impact

- Adds Turso/libSQL, Drizzle ORM and migrations, lightweight validation, market-data adapters, and Vercel's stateless MCP handler.
- Adds server-only data-access, valuation, ingestion, and MCP modules plus a small Server Component dashboard.
- Adds secrets for Turso, the single-owner MCP credential, scheduled refresh authorization, and optional keyed quote providers.
- Adds a daily refresh endpoint suitable for Vercel Cron and an explicit manual refresh path through MCP.
- Requires correctness tests for ledger arithmetic and currency conversion, integration tests for MCP authorization, and bundle/build measurements before accepting UI dependencies.
