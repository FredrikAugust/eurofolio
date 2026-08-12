## Context

See `proposal.md` for motivation and scope. The repository is a clean Next.js 16.3 App Router application. The first release is single-owner, has no broker integrations, uses EUR for reporting, persists in Turso, and exposes MCP as its only programmatic interface. Both the production app and the development workflow must stay comfortable on a low-powered computer.

## Goals / Non-Goals

**Goals:**

- Keep the portfolio ledger authoritative, exact, replayable, and independent of any market-data provider.
- Make the primary dashboard useful with a small, measured client chart island and a fixed number of database operations.
- Keep MCP requests stateless so they work across Vercel instances without Redis or sticky sessions.
- Make price and FX failures visible while retaining the last known usable valuation.
- Keep local installs and builds lightweight enough to measure continuously.

**Non-Goals:**

- Maintaining an offline database replica inside a Vercel function.
- Adding a client-side state store, query cache, component kit, or charting framework for the first slice.
- Calculating tax lots, TWR, XIRR, corporate actions, or shorts in the initial projection.
- Making free market data authoritative enough for trading or tax filing.

## Decisions

### 1. Server-first modular monolith

Use one Next.js application with server-only modules for ledger, valuation, market data, authentication, and MCP. Server Components call the data-access layer directly; only MCP and scheduled refresh require Route Handlers.

This avoids a browser API round trip, separate service, duplicated types, and extra local processes. A separate backend or tRPC layer can be added later only if another client appears.

### 2. Turso through Drizzle's libSQL HTTP driver

Use Turso as the durable remote SQLite-compatible database, Drizzle for typed schema/query construction, and versioned SQL migrations. Vercel functions connect remotely; they do not create embedded replicas on ephemeral disk. Migrations run explicitly during development or deployment, never during a request.

Drizzle is selected over Prisma to avoid a generated engine and reduce installation, memory, cold-start, and bundling cost. Raw SQL alone would be smaller but would make schema evolution and typed result mapping more error-prone.

### 3. Ledger-oriented schema

Use normalized tables for `accounts`, `instruments`, `ledger_events`, `security_prices`, `fx_rates`, and `refresh_runs`. Stable IDs use platform UUID generation. Dates used for financial observations are ISO `YYYY-MM-DD`; creation timestamps are UTC instants.

The ledger is the source of truth. Holdings and cash are projected in server code from ordered events. The first slice does not maintain a second mutable positions table, avoiding projection drift. Queries load events, latest eligible prices, and rates in bounded batches and build lookup maps before valuation.

If replay cost becomes measurable, a rebuildable snapshot table can be introduced without changing the behavioral specs.

### 4. Exact decimals stored canonically as text

Quantities, unit prices, cash amounts, and FX rates are stored as canonical decimal strings and processed with a small arbitrary-precision decimal library in server-only code. The system rejects exponent notation, non-finite values, excess scale, negative values where disallowed, and non-canonical input after normalization.

This avoids SQLite `REAL` binary rounding and avoids overflow/scale coupling from fixed signed integers. Numeric SQL aggregation is intentionally avoided in the first slice; portfolio-sized event sets are fetched once and aggregated in process. EUR presentation rounds once, half-even, to two decimal places; stored calculations retain configured higher precision.

### 5. Normalize FX as quote currency per EUR

Every FX observation uses EUR as base and stores foreign-currency units per one EUR. A native amount converts to EUR by division. EUR uses the exact identity rate `1`. Valuation selects the latest observation on or before the requested date, allowing weekends and holidays while exposing the chosen date.

ECB is the primary source for supported currencies. Any future source adapter must normalize direction before persistence. Missing conversion produces a partial result rather than zero.

### 6. Provider adapters with database-backed cache

Define a small server-only interface for symbol search, latest/daily security observations, and FX observations. Begin with:

- ECB Data API for daily reference FX rates.
- `yahoo-finance2` for broad stock and ETF discovery and daily prices without a key.
- Manual observations as the reliable owner fallback.
- An optional Twelve Data adapter only when a key is configured.

Every accepted observation stores provider, provider symbol, native currency, effective date, retrieval time, and raw-source metadata needed for diagnosis. Unique keys make refreshes idempotent. The database is the cache and the dashboard never calls providers. Yahoo is unofficial, so adapters are replaceable and errors are isolated per instrument.

### 7. Scheduled and on-demand refresh share one service

One refresh service performs bounded parallel provider calls, validates results, and batch-writes observations. It is invoked either by an authenticated MCP tool or a Vercel Cron Route Handler protected by `CRON_SECRET`. Concurrency remains deliberately small to respect free providers and weak local hardware.

No resident worker, queue, or realtime subscription is needed for daily data. Refresh failures are recorded and do not delete last-known-good observations.

### 8. Stateless MCP through `mcp-handler` v2

Use Vercel's `mcp-handler` v2 with MCP SDK v2 and Zod v4 at `/mcp`. It maps naturally to a Web-standard Next.js Route Handler and supports stateless Streamable HTTP without Redis. Register narrow read and write tools backed by the same domain services as the dashboard and refresh path.

Tool inputs are bounded, exact-decimal fields remain strings, batch writes are transactional, list operations paginate, and errors return stable machine-readable codes. MCP is the only programmatic portfolio surface; internal web actions are not public APIs.

### 9. Better Auth for one bootstrapped owner

Use Better Auth's minimal server entry, Drizzle adapter, email/password flow, standard Next.js handler, and database-backed sessions for the dashboard. Public signup is disabled in normal operation. A one-shot owner bootstrap command may temporarily enable signup only while the database has no user; it refuses to create a second user. Better Auth owns password hashing, sessions, cookie flags, and CSRF/origin protections.

Keep the independent high-entropy `EUROFOLIO_OWNER_TOKEN` for MCP bearer authentication because agent clients need non-interactive access. Compare fixed-length token digests with a timing-safe primitive. Better Auth routes expose authentication only and never portfolio operations. Secrets and financial arguments remain redacted from logs.

### 10. Server-first dashboard with one lightweight chart island

Build the dashboard shell, totals, holdings, and freshness tables as Server Components and semantic HTML. Use Lightweight Charts for a single interactive historical EUR-value island; its base bundle is approximately 35 kB and it is designed for large financial time series. Retain CSS bars/server markup for allocation and avoid a component kit, client data-fetcher, global state store, or animation library.

Use a system font stack to avoid build-time font downloads. Batch-load historical inputs once and calculate bounded display samples server-side. The dashboard exposes observation dates and missing/stale warnings directly in HTML and remains useful before the chart hydrates.

### 11. Performance budgets are release criteria

Record baseline cold and warm `pnpm build` time and peak memory. For the MVP:

- The primary dashboard has one intentional client component boundary for Lightweight Charts.
- Dashboard data access uses a fixed number of batched database operations and zero provider calls.
- No production dependency is accepted without documenting why a platform or small local function cannot replace it.
- Use Next.js 16.3 Turbopack filesystem caching defaults and automatic memory eviction for local development.
- Run Next's bundle analysis before accepting the first UI feature and retain the result for comparison.

These are regression budgets rather than promises about absolute timings on unknown hardware.

## Risks / Trade-offs

- **Unofficial Yahoo endpoints can change or block requests** → Isolate the adapter, retain last-known-good data, support manual observations, and keep a keyed fallback interface.
- **Text decimals prevent useful SQL arithmetic and ordering** → Keep all exact arithmetic in a tested server-only domain layer; revisit scaled integers only with measured evidence.
- **Full ledger replay eventually grows** → Index by account, instrument, and effective date; batch-load once; introduce rebuildable snapshots only after profiling.
- **One bearer token grants full control** → Require high entropy, keep it server-side, compare safely, support rotation, rate-limit failures, and never log credentials.
- **MCP write tools can amplify agent mistakes** → Validate strictly, bound batches, require idempotency keys, make writes atomic, and expose correction tools.
- **ECB rates do not cover every possible currency** → Report incomplete valuations and allow a clearly marked manual rate rather than silently cross-converting.
- **Zero client JavaScript limits interaction** → Prefer fast documents and standard forms initially; add isolated client islands only when a measured usability need appears.

## Migration Plan

1. Add dependencies and schema locally, generate the initial SQL migration, and test against an isolated Turso development database.
2. Implement and test pure ledger/decimal/valuation modules before exposing persistence or network routes.
3. Add authenticated MCP tools, then exercise them against the development database with the MCP inspector/client.
4. Add provider refresh and seed representative EUR, USD, GBP, and DKK observations.
5. Add the protected dashboard and verify it without client JavaScript.
6. Link the Vercel project, configure secrets, apply migrations once, and deploy a protected preview.
7. Verify MCP authorization, dashboard data, refresh idempotency, partial valuation, logs, bundle composition, and build resource use before production promotion.

Rollback removes the Vercel deployment while preserving the Turso database. Schema changes must remain backward-compatible until a backup and verified restore path exist.

## Open Questions

- Choose the initial staleness thresholds for security prices and FX rates after observing the owner's markets; defaults can be changed without altering the interface.
- Decide whether historical charts belong in the MVP after current-position performance and payload measurements are available.
