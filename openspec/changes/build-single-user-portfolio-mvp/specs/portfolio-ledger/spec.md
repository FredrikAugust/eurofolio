## Purpose

Defines the single-owner transaction ledger whose deterministic records are the source of truth for accounts, cash balances, and security holdings.

## ADDED Requirements

### Requirement: Account management
The system SHALL let the owner create, inspect, rename, and archive accounts with a stable identifier, display name, institution label, and ISO 4217 default currency.

#### Scenario: Create an account
- **WHEN** the owner submits a unique account name and valid default currency through MCP
- **THEN** the system persists the account and returns its stable identifier

#### Scenario: Archive an account with history
- **WHEN** the owner archives an account that has transactions
- **THEN** the account is excluded from new transaction selection but its history and holdings remain available

### Requirement: Instrument registry
The system SHALL store each instrument independently from accounts with a stable identifier, name, asset class, native currency, quote-provider symbol, and optional ISIN and exchange metadata.

#### Scenario: Register a listed ETF
- **WHEN** the owner registers an ETF with a valid native currency and provider symbol
- **THEN** the system returns an instrument that can be referenced by transactions and market prices

#### Scenario: Reject an ambiguous duplicate
- **WHEN** the owner registers an instrument with the same provider and provider symbol as an existing instrument
- **THEN** the system rejects the duplicate and identifies the existing instrument

### Requirement: Supported ledger events
The system SHALL record buy, sell, deposit, withdrawal, dividend, fee, and tax events with an account, effective date, native currency, exact decimal amounts, and an optional idempotency key. Buy and sell events SHALL additionally require an instrument, exact quantity, and exact unit price.

#### Scenario: Record a buy
- **WHEN** the owner submits a valid buy with positive quantity and unit price
- **THEN** the ledger stores the event and the calculated holding increases by that exact quantity

#### Scenario: Retry an idempotent write
- **WHEN** the owner repeats a write with an idempotency key already accepted for the same operation
- **THEN** the system returns the original result without creating another event

#### Scenario: Reject an unsupported short sale
- **WHEN** a sell would reduce an instrument holding below zero
- **THEN** the system rejects the event and leaves the ledger unchanged

### Requirement: Deterministic holdings and cash
The system SHALL derive current quantities and cash balances from ordered ledger events and SHALL produce the same result whenever the same valid event set is replayed.

#### Scenario: Replay a partial sale
- **WHEN** a buy followed by a smaller sell is replayed in effective-date and creation order
- **THEN** the resulting holding equals the bought quantity minus the sold quantity

#### Scenario: Correct a transaction
- **WHEN** the owner replaces or deletes an existing event through MCP
- **THEN** all affected holdings and cash balances are recalculated from the corrected ledger

### Requirement: Atomic batch ingestion
The system SHALL accept bounded batches of ledger events and commit either the complete valid batch or none of it.

#### Scenario: One event in a batch is invalid
- **WHEN** any event in an ingestion batch fails validation
- **THEN** no event from that batch is persisted and the response identifies the failing item

