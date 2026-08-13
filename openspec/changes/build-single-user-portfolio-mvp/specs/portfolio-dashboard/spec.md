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
The primary dashboard SHALL deliver useful holdings, totals, allocation, and freshness information in server-rendered HTML while limiting client-side JavaScript to measured interactive chart islands.

#### Scenario: JavaScript is disabled
- **WHEN** an authenticated owner loads the primary dashboard with client-side JavaScript disabled
- **THEN** current totals, holdings, allocation, and freshness remain readable while interactive chart behavior is unavailable

#### Scenario: Interactive history chart
- **WHEN** client-side JavaScript is available and historical valuation samples exist
- **THEN** the dashboard renders a responsive, interactive EUR value chart without refetching portfolio data from the browser

### Requirement: Bounded dashboard work
The dashboard SHALL fetch portfolio inputs without per-holding database or provider request waterfalls and SHALL never contact a market-data provider while rendering a page.

#### Scenario: Render many holdings
- **WHEN** the dashboard renders a portfolio containing many registered holdings
- **THEN** database access remains bounded by a fixed number of batched operations independent of the holding count

### Requirement: Deliberate financial visual system
The dashboard SHALL use a restrained, token-driven financial visual system with compact sans-serif typography, tabular numerals, neutral surfaces, limited radii, and decoration only when it communicates state. It SHALL NOT rely on gradients, ambient shadows, ornamental badges, repeated uppercase labels, or card containers as the primary means of hierarchy.

#### Scenario: Scan the overview
- **WHEN** the owner opens the overview
- **THEN** typography, alignment, spacing, and rules establish the hierarchy before color or decoration

### Requirement: Account-stacked portfolio history
The dashboard SHALL show historical portfolio value as stacked account contributions in EUR, with stable account colors, a consolidated boundary, honest missing-data treatment, and accessible values outside the canvas.

#### Scenario: Inspect a historical date
- **WHEN** the owner focuses or touches a chart date
- **THEN** the dashboard shows the date, consolidated EUR total, each visible account's EUR contribution, and whether the sample is complete

#### Scenario: Historical price is unavailable
- **WHEN** an account cannot be valued on a sample date
- **THEN** the chart marks the sample incomplete and does not silently treat the missing account as zero

### Requirement: Task-oriented portfolio navigation
The dashboard SHALL organize read-only portfolio use into Overview, Holdings, Activity, and Data sections while keeping all portfolio mutations MCP-only.

#### Scenario: Audit an imported transaction
- **WHEN** the owner opens Activity and filters by account and event type
- **THEN** matching ledger events are presented chronologically with exact native values and notes

#### Scenario: Diagnose a stale valuation
- **WHEN** the owner opens Data
- **THEN** provider dates, refresh status, manual observations, stale inputs, and missing inputs are visible without scanning the holdings register

### Requirement: Mobile-first portfolio access
The dashboard SHALL support 320 CSS pixel and wider viewports without horizontal page scrolling, hover-only behavior, obscured focus, or loss of financial context. Frequent mobile controls SHALL provide at least 44 by 44 CSS pixel targets.

#### Scenario: Review holdings on a phone
- **WHEN** the owner opens Holdings on a narrow touch viewport
- **THEN** each position shows its instrument and EUR value immediately and exposes quantity, native value, account, source, FX, and dates through an accessible disclosure

#### Scenario: Use the history chart on a phone
- **WHEN** the owner touches or keyboard-focuses a history sample
- **THEN** account values appear in a stable detail region that does not obscure the chart
