## Purpose

Defines reliable delayed market-price and EUR foreign-exchange ingestion with transparent provenance, freshness, and owner-controlled fallbacks.

## ADDED Requirements

### Requirement: End-of-day security prices
The system SHALL retrieve and persist delayed or end-of-day prices for registered stocks and ETFs through replaceable provider adapters.

#### Scenario: Refresh a supported instrument
- **WHEN** a provider returns a valid close price, currency, and observation time
- **THEN** the system stores the normalized observation with provider provenance and makes it eligible for valuation

#### Scenario: Provider failure
- **WHEN** one provider request fails or returns invalid data
- **THEN** the refresh continues for other instruments, records the failure, and preserves the last valid observation

### Requirement: EUR reference rates
The system SHALL ingest official daily reference rates expressed as units of foreign currency per EUR and SHALL normalize other provider directions before storage.

#### Scenario: Import ECB rates
- **WHEN** the ECB publishes a daily USD-per-EUR observation
- **THEN** the system stores the rate with EUR as base, USD as quote, the publication date, and ECB provenance

#### Scenario: Unsupported currency
- **WHEN** a security uses a currency not provided by the configured FX sources
- **THEN** the refresh records a missing-rate condition without inventing a conversion

### Requirement: Idempotent observations
The system SHALL uniquely identify a market observation by instrument or currency pair, observation date, and provider so repeated refreshes update or preserve one record rather than create duplicates.

#### Scenario: Repeat a daily refresh
- **WHEN** the same provider observation is ingested twice
- **THEN** exactly one effective observation remains for that provider and date

### Requirement: Manual price override
The system SHALL let the owner provide an exact manual security price or FX rate with a reason, and a valid manual observation SHALL take precedence for its specified date.

#### Scenario: Override an incorrect close
- **WHEN** the owner records a manual price for an instrument and date that also has provider data
- **THEN** valuation uses the manual price and reports it as a manual override

### Requirement: Freshness reporting
The system SHALL classify every effective price and FX rate as current, stale, missing, or manually overridden according to configurable day thresholds.

#### Scenario: Market has not refreshed
- **WHEN** the newest eligible security price is older than the configured threshold
- **THEN** the holding remains valued from that observation but is visibly classified as stale

