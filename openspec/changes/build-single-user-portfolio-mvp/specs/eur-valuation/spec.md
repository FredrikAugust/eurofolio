## Purpose

Defines exact, date-aware conversion of native-currency portfolio data into the owner's EUR reporting currency without discarding original values.

## ADDED Requirements

### Requirement: EUR reporting currency
The system SHALL use EUR as the immutable reporting currency for portfolio totals while preserving each transaction, price, cash balance, and instrument in its native ISO 4217 currency.

#### Scenario: Value a USD holding
- **WHEN** a holding has a USD market price and a valid USD-per-EUR rate for the valuation date
- **THEN** the system reports both the native USD value and its converted EUR value

#### Scenario: Value an EUR holding
- **WHEN** a holding's native currency is EUR
- **THEN** the system uses an exchange rate of exactly one and performs no external FX lookup

### Requirement: Date-aware exchange-rate selection
For a non-EUR amount, the system SHALL select the latest valid exchange-rate observation on or before the requested valuation date and SHALL disclose the selected observation date.

#### Scenario: Weekend valuation
- **WHEN** a portfolio is valued on a weekend with no same-day FX observation
- **THEN** the most recent preceding observation is used and its date is returned

#### Scenario: No usable rate
- **WHEN** no exchange-rate observation exists on or before the valuation date
- **THEN** the affected amount is marked unvalued and is not silently treated as zero

### Requirement: Exact decimal arithmetic
The system SHALL parse, store, calculate, and round quantities, monetary values, prices, and exchange rates using deterministic decimal arithmetic rather than binary floating-point arithmetic.

#### Scenario: Repeated fractional purchases
- **WHEN** fractional quantities and prices are aggregated repeatedly
- **THEN** the result is independent of operation grouping and contains no binary floating-point artifact

#### Scenario: Display rounding
- **WHEN** an exact EUR value is formatted for display
- **THEN** the system rounds once at the display boundary using the documented rounding mode

### Requirement: Portfolio completeness
The system SHALL expose whether a total is complete and SHALL list holdings or balances excluded because required prices or exchange rates are missing.

#### Scenario: One holding lacks a price
- **WHEN** an otherwise valid portfolio contains an instrument without a usable price
- **THEN** the system reports a partial EUR total and identifies the unvalued instrument

