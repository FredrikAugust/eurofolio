## 1. Baseline and dependencies

- [ ] 1.1 Record cold/warm build duration, peak memory, generated routes, and initial bundle analysis for the untouched scaffold.
- [ ] 1.2 Replace remote Google fonts with a system font stack and confirm an offline production build succeeds.
- [ ] 1.3 Add only the pinned pnpm dependencies required for Drizzle/libSQL, exact decimals, Zod, and stateless MCP; document the purpose and installed cost of each production dependency.
- [ ] 1.4 Add server-only environment validation plus a redacted `.env.example` for Turso, owner token, session secret, cron secret, and optional quote-provider keys.
- [ ] 1.5 Add lightweight test, typecheck, database migration, and bundle-analysis scripts using pnpm exclusively.

## 2. Turso persistence

- [ ] 2.1 Define Drizzle schemas and constraints for accounts, instruments, ledger events, security prices, FX rates, and refresh runs.
- [ ] 2.2 Add indexes and uniqueness constraints for replay order, idempotency keys, provider symbols, observation selection, and refresh history.
- [ ] 2.3 Generate and review the first versioned SQL migration without embedding credentials in repository files.
- [ ] 2.4 Implement one server-only Turso HTTP client and data-access boundary with batched query helpers and no request-time migrations.
- [ ] 2.5 Apply the migration to an isolated development database and verify insert, transaction rollback, unique constraint, and batch behavior.

## 3. Exact ledger domain

- [ ] 3.1 Implement canonical decimal parsing, normalization, arithmetic, scale limits, and half-even display rounding with table-driven tests.
- [ ] 3.2 Implement ISO currency, financial date, account, instrument, and ledger-event validation schemas with stable machine-readable errors.
- [ ] 3.3 Implement deterministic cash and holdings replay for buy, sell, deposit, withdrawal, dividend, fee, and tax events.
- [ ] 3.4 Test fractional quantities, partial sales, event ordering, fees, dividends, rejected shorts, malformed decimals, and repeatable replay results.
- [ ] 3.5 Implement account and instrument repositories plus create, archive, list, and lookup services.
- [ ] 3.6 Implement atomic event create, correction, deletion, and bounded batch ingestion with idempotency-key tests.

## 4. EUR valuation

- [ ] 4.1 Implement normalized foreign-units-per-EUR rate handling and exact native-to-EUR conversion.
- [ ] 4.2 Implement latest-on-or-before price and FX selection, EUR identity rates, manual precedence, and freshness classification.
- [ ] 4.3 Implement a portfolio query that batch-loads ledger inputs, price candidates, and FX candidates without per-holding queries.
- [ ] 4.4 Implement consolidated holdings, account totals, asset allocation, partial-total status, and missing-data diagnostics.
- [ ] 4.5 Test EUR, USD, GBP, and DKK valuation, weekends, missing rates, missing prices, manual overrides, stale observations, and rounding boundaries.

## 5. Market-data ingestion

- [ ] 5.1 Define server-only provider interfaces and normalized security-price, symbol-search, and FX observation contracts.
- [ ] 5.2 Implement the ECB daily reference-rate adapter with response validation, normalized direction, timeouts, and fixture-based tests.
- [ ] 5.3 Implement the Yahoo Finance stock/ETF search and daily-price adapter with isolated failures, timeouts, and fixture-based tests.
- [ ] 5.4 Implement manual security-price and FX observations with reason metadata and precedence tests.
- [ ] 5.5 Implement bounded-concurrency refresh orchestration, idempotent batch persistence, per-item error capture, and last-known-good preservation.
- [ ] 5.6 Add the optional Twelve Data adapter behind configuration and verify that the application remains functional when it is absent.
- [ ] 5.7 Add a `CRON_SECRET`-protected daily refresh route that delegates to the same refresh service used by MCP.

## 6. Single-owner security and MCP

- [ ] 6.1 Implement timing-safe high-entropy owner-token verification, secret redaction, and bounded failed-auth handling.
- [ ] 6.2 Implement signed HttpOnly owner sessions and a progressive-enhancement login/logout flow without a user table or client JavaScript.
- [ ] 6.3 Add a stateless `mcp-handler` v2 endpoint and verify initialization with both current and compatible legacy Streamable HTTP clients.
- [ ] 6.4 Add paginated MCP reads for accounts, ledger events, holdings, EUR summary, and data freshness.
- [ ] 6.5 Add MCP writes for account/instrument management, event creation/correction/deletion, bounded batch ingestion, and manual observations.
- [ ] 6.6 Add the MCP market refresh tool with explicit progress/result summaries and no financial payload logging.
- [ ] 6.7 Test missing/invalid bearer tokens, schema errors, unknown identifiers, idempotent retries, atomic batch failure, and tool result contracts.
- [ ] 6.8 Confirm that no general REST mutation surface exists and that internal web actions independently enforce owner authorization.

## 7. Zero-JavaScript dashboard

- [ ] 7.1 Replace the starter page with an authenticated Server Component dashboard shell and accessible navigation.
- [ ] 7.2 Render consolidated EUR value, completeness, account totals, holdings, native values, and asset allocation from the portfolio query.
- [ ] 7.3 Render provider, effective date, freshness, manual override, stale-data, and missing-data indicators.
- [ ] 7.4 Add lightweight responsive CSS and server-rendered SVG/CSS visuals without installing a chart or component library.
- [ ] 7.5 Verify the complete primary dashboard remains readable and navigable with client JavaScript disabled.
- [ ] 7.6 Verify dashboard database work remains a fixed number of batched operations as fixture holdings increase.

## 8. Verification and handoff

- [ ] 8.1 Run unit and integration tests, ESLint, TypeScript checks, migration validation, and production builds from a clean checkout.
- [ ] 8.2 Run Next.js bundle analysis and compare build time, peak memory, route output, and client JavaScript against the recorded baseline.
- [ ] 8.3 Perform an end-to-end local flow: authenticate, create data through MCP, refresh market data, correct an event, and inspect the dashboard.
- [ ] 8.4 Audit environment exposure, logs, cookies, MCP authorization, input bounds, security headers, and dependency advisories.
- [ ] 8.5 Document Turso migration/backup/restore, owner-token rotation, MCP client configuration, provider limitations, and local pnpm commands.
- [ ] 8.6 With explicit deployment authorization, configure an isolated Vercel preview, apply migrations once, and verify dashboard, MCP, cron, logs, and rollback before production promotion.
