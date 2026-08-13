# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One owner uses Eurofolio on desktop and phone to check investments held across Endavu, Revolut, and Nordnet without signing into each service.

## Product Purpose

Eurofolio consolidates current holdings, cash, account values, allocation, valuation provenance, and historical snapshots into one trustworthy EUR-denominated view. Success means the owner can understand what they own, where it is held, and whether the numbers are current within seconds.

## Positioning

Eurofolio is a strictly single-user portfolio ledger operated through MCP: it does not connect to brokers and does not expose portfolio mutations in the web interface.

## Operating Context

The owner checks the dashboard periodically for a quick consolidated view, uses both desktop and phone, and maintains transactions and corrections through the MCP server. Market prices and FX rates may be delayed; provenance and missing valuations must remain explicit.

## Capabilities and Constraints

- EUR is the reporting and master currency; holdings and cash retain their native currencies.
- Multiple accounts, currencies, stocks, ETFs, and funds are supported.
- Portfolio changes are MCP-only. The web application is read-only apart from authentication.
- Better Auth protects the single-owner session.
- Turso/libSQL stores the ledger and valuation observations.
- Performance is a primary constraint, especially on low-powered computers and phones.
- Historical charts must never fabricate values or treat missing observations as zero.
- Next.js 16.3 and pnpm are fixed stack choices.

## Brand Commitments

The product name is Eurofolio. Interface language should be direct, factual, and calm. The visual identity must feel specific to personal finance and must avoid recognizable AI-dashboard templates.

## Evidence on Hand

- Real portfolio data across Endavu, Revolut, and Nordnet in Turso.
- Imported broker statements and screenshots used to reconcile current positions.
- Existing authenticated dashboard at `src/app/page.tsx`.
- No broker logos, proprietary market-data branding, performance claims, or financial advice should be invented.

## Product Principles

1. Trust before decoration: provenance, completeness, and dates stay visible.
2. One-glance comprehension: total, account distribution, asset mix, and important positions lead.
3. Honest history: missing data is an explicit state, never a misleading chart point.
4. Read-only clarity: the web surface shows and explains; MCP changes the ledger.
5. Fast by construction: server-rendered information and narrowly scoped client JavaScript.

## Accessibility & Inclusion

The interface must work with keyboard navigation, visible focus, screen-reader semantics, 200% zoom, reduced motion, and touch targets suitable for phone use.
