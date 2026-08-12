## Purpose

Defines the private, server-rendered dashboard that gives the owner a fast EUR overview while retaining native values and data-quality warnings.

## ADDED Requirements

### Requirement: Authenticated single-owner access
The dashboard SHALL require the configured owner credential and SHALL not expose portfolio data to an unauthenticated request.

#### Scenario: Unauthenticated dashboard request
- **WHEN** a request has no valid owner session
- **THEN** the system returns the sign-in experience without portfolio totals, holdings, or account names

### Requirement: Consolidated overview
The dashboard SHALL display the complete or partial EUR portfolio value, totals by account, holdings with native and EUR values, and allocation by asset class.

#### Scenario: View holdings across accounts
- **WHEN** the authenticated owner opens the dashboard with valued holdings in multiple accounts
- **THEN** one response shows the consolidated EUR total and each account's contribution

#### Scenario: Partial valuation
- **WHEN** one or more holdings cannot be valued
- **THEN** the dashboard labels the total as partial and identifies each missing price or rate

### Requirement: Data freshness visibility
The dashboard SHALL show the effective date, source, and freshness classification for prices and exchange rates used in each valuation.

#### Scenario: Stale foreign price
- **WHEN** a non-EUR holding uses a stale security price or exchange rate
- **THEN** the dashboard visibly marks the holding stale and shows the limiting observation date

### Requirement: Minimal client execution
The primary dashboard SHALL deliver useful holdings, totals, allocation, and freshness information in server-rendered HTML without requiring client-side JavaScript.

#### Scenario: JavaScript is disabled
- **WHEN** an authenticated owner loads the primary dashboard with client-side JavaScript disabled
- **THEN** the complete current overview remains readable and navigable

### Requirement: Bounded dashboard work
The dashboard SHALL fetch portfolio inputs without per-holding database or provider request waterfalls and SHALL never contact a market-data provider while rendering a page.

#### Scenario: Render many holdings
- **WHEN** the dashboard renders a portfolio containing many registered holdings
- **THEN** database access remains bounded by a fixed number of batched operations independent of the holding count

