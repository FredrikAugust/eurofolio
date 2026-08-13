## 1. Baseline and dependencies

- [x] 1.1 Record cold/warm build duration, peak memory, generated routes, and initial bundle analysis for the untouched scaffold.
- [x] 1.2 Replace remote Google fonts with a system font stack and confirm an offline production build succeeds.
- [x] 1.3 Add only the pinned pnpm dependencies required for Drizzle/libSQL, exact decimals, Zod, stateless MCP, Better Auth, and lightweight charts; document the purpose and installed cost of each production dependency.
- [x] 1.4 Add server-only environment validation plus a redacted `.env.example` for Turso, owner token, session secret, cron secret, and optional quote-provider keys.
- [x] 1.5 Add lightweight test, typecheck, database migration, and bundle-analysis scripts using pnpm exclusively.

## 2. Turso persistence

- [x] 2.1 Define Drizzle schemas and constraints for accounts, instruments, ledger events, security prices, FX rates, and refresh runs.
- [x] 2.2 Add indexes and uniqueness constraints for replay order, idempotency keys, provider symbols, observation selection, and refresh history.
- [x] 2.3 Generate and review the first versioned SQL migration without embedding credentials in repository files.
- [x] 2.4 Implement one server-only Turso HTTP client and data-access boundary with batched query helpers and no request-time migrations.
- [x] 2.5 Apply the migration to an isolated development database and verify insert, transaction rollback, unique constraint, and batch behavior.

## 3. Exact ledger domain

- [x] 3.1 Implement canonical decimal parsing, normalization, arithmetic, scale limits, and half-even display rounding with table-driven tests.
- [x] 3.2 Implement ISO currency, financial date, account, instrument, and ledger-event validation schemas with stable machine-readable errors.
- [x] 3.3 Implement deterministic cash and holdings replay for buy, sell, deposit, withdrawal, dividend, fee, and tax events.
- [x] 3.4 Test fractional quantities, partial sales, event ordering, fees, dividends, rejected shorts, malformed decimals, and repeatable replay results.
- [x] 3.5 Implement account and instrument repositories plus create, archive, list, and lookup services.
- [x] 3.6 Implement atomic event create, correction, deletion, and bounded batch ingestion with idempotency-key tests.

## 4. EUR valuation

- [x] 4.1 Implement normalized foreign-units-per-EUR rate handling and exact native-to-EUR conversion.
- [x] 4.2 Implement latest-on-or-before price and FX selection, EUR identity rates, manual precedence, and freshness classification.
- [x] 4.3 Implement a portfolio query that batch-loads ledger inputs, price candidates, and FX candidates without per-holding queries.
- [x] 4.4 Implement consolidated holdings, account totals, asset allocation, partial-total status, and missing-data diagnostics.
- [x] 4.5 Test EUR, USD, GBP, and DKK valuation, weekends, missing rates, missing prices, manual overrides, stale observations, and rounding boundaries.

## 5. Market-data ingestion

- [x] 5.1 Define server-only provider interfaces and normalized security-price, symbol-search, and FX observation contracts.
- [x] 5.2 Implement the ECB daily reference-rate adapter with response validation, normalized direction, timeouts, and fixture-based tests.
- [x] 5.3 Implement the Yahoo Finance stock/ETF search and daily-price adapter with isolated failures, timeouts, and fixture-based tests.
- [x] 5.4 Implement manual security-price and FX observations with reason metadata and precedence tests.
- [x] 5.5 Implement bounded-concurrency refresh orchestration, idempotent batch persistence, per-item error capture, and last-known-good preservation.
- [x] 5.6 Add the optional Twelve Data adapter behind configuration and verify that the application remains functional when it is absent.
- [x] 5.7 Add a `CRON_SECRET`-protected daily refresh route that delegates to the same refresh service used by MCP.
- [x] 5.8 Add bounded Yahoo and ECB historical backfill with month-end downsampling, idempotent persistence, and an owner-authorized one-time route.

## 6. Single-owner security and MCP

- [x] 6.1 Implement timing-safe high-entropy MCP owner-token verification, secret redaction, and bounded failed-auth handling.
- [x] 6.2 Implement Better Auth Drizzle persistence, one-owner bootstrap, database-backed sessions, and an email/password login/logout flow with public signup disabled.
- [x] 6.3 Add a stateless `mcp-handler` v2 endpoint and verify initialization with both current and compatible legacy Streamable HTTP clients.
- [x] 6.4 Add paginated MCP reads for accounts, ledger events, holdings, EUR summary, and data freshness.
- [x] 6.5 Add MCP writes for account/instrument management, event creation/correction/deletion, bounded batch ingestion, and manual observations.
- [x] 6.6 Add the MCP market refresh tool with explicit progress/result summaries and no financial payload logging.
- [ ] 6.7 Test missing/invalid bearer tokens, schema errors, unknown identifiers, idempotent retries, atomic batch failure, and tool result contracts.
- [x] 6.8 Confirm that no general REST mutation surface exists and that internal web actions independently enforce owner authorization.

## 7. Server-first dashboard and charts

- [x] 7.1 Replace the starter page with an authenticated Server Component dashboard shell and accessible navigation.
- [x] 7.2 Render consolidated EUR value, completeness, account totals, holdings, native values, and asset allocation from the portfolio query.
- [x] 7.3 Render provider, effective date, freshness, manual override, stale-data, and missing-data indicators.
- [x] 7.4 Add lightweight responsive CSS, allocation visuals, and a single Lightweight Charts history island with measured bundle cost.
- [ ] 7.5 Verify current totals, holdings, allocation, freshness, and navigation remain readable with client JavaScript disabled; verify chart interaction when enabled.
- [x] 7.6 Verify dashboard database work remains a fixed number of batched operations as fixture holdings increase.
- [x] 7.7 Record authenticated desktop and phone screenshots, DOM hierarchy, current chart payload, and client bundle size as the redesign baseline.
- [x] 7.8 Replace the current gradient/card/serif treatment with neutral semantic tokens, one restrained sans-serif hierarchy, tabular numerals, compact rules, and no decorative shadows or badges.
- [x] 7.9 Split the owner experience into server-rendered Overview, Holdings, Activity, and Data routes with desktop top navigation and mobile safe-area bottom navigation.
- [ ] 7.10 Extend the bounded history projection with per-account EUR values and per-date completeness; test account ordering, missing observations, transfers, cash, and exact consolidated totals.
- [ ] 7.11 Rebuild the existing Lightweight Charts island as cumulative account area boundaries with stable colors, raw account tooltip values, range controls, and a non-JavaScript summary.
- [x] 7.12 Build the responsive holdings register as a semantic desktop table and equivalent mobile disclosure rows without duplicating financial calculations.
- [x] 7.13 Add a read-only, filterable activity ledger and a data-quality view for refresh runs, provenance, manual observations, staleness, and gaps; retain MCP as the only mutation surface.
- [ ] 7.14 Verify 320/375/390/430/768/1024 widths, long labels, three currencies, touch and keyboard operation, 200% zoom, reduced motion, contrast, and 44-pixel frequent controls.
- [ ] 7.15 Re-run React/Next review, database-batch tests, production build, browser console checks, and bundle analysis; reject any new client framework or material chart regression.

## 8. Verification and handoff

- [ ] 8.1 Run unit and integration tests, ESLint, TypeScript checks, migration validation, and production builds from a clean checkout.
- [ ] 8.2 Run Next.js bundle analysis and compare build time, peak memory, route output, and client JavaScript against the recorded baseline.
- [ ] 8.3 Perform an end-to-end local flow: authenticate, create data through MCP, refresh market data, correct an event, and inspect the dashboard.
- [ ] 8.4 Audit environment exposure, logs, cookies, MCP authorization, input bounds, security headers, and dependency advisories.
- [ ] 8.5 Document Turso migration/backup/restore, owner-token rotation, MCP client configuration, provider limitations, and local pnpm commands.
- [ ] 8.6 With explicit deployment authorization, configure an isolated Vercel preview, apply migrations once, and verify dashboard, MCP, cron, logs, and rollback before production promotion.
