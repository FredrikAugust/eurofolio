## Purpose

Defines the owner's sole programmatic integration surface as a secure, stateless MCP server for portfolio inspection, maintenance, and refresh operations.

## ADDED Requirements

### Requirement: Stateless Streamable HTTP MCP
The system SHALL expose a standards-compatible stateless Streamable HTTP MCP endpoint whose requests can be handled by independent application instances.

#### Scenario: Initialize an MCP client
- **WHEN** an authenticated compatible client initializes against the MCP URL
- **THEN** the server advertises its portfolio tools and resources without requiring sticky sessions

### Requirement: Bearer-token authorization
Every MCP request SHALL require the configured high-entropy owner bearer token, compare credentials without timing-dependent string comparison, and exclude credentials and financial payloads from logs.

#### Scenario: Invalid bearer token
- **WHEN** an MCP request contains a missing or invalid owner token
- **THEN** the server rejects it without invoking a tool or disclosing portfolio data

### Requirement: Portfolio read interface
The MCP server SHALL provide tools or resources to list accounts, inspect holdings, retrieve the EUR portfolio summary, inspect data freshness, and retrieve ledger events using bounded pagination.

#### Scenario: Read portfolio summary
- **WHEN** the authenticated owner requests the portfolio summary
- **THEN** the response includes EUR totals, completeness, native values, valuation dates, and stale or missing data warnings

### Requirement: Portfolio write interface
The MCP server SHALL provide validated tools to create or archive accounts, register instruments, create or correct ledger events, ingest bounded event batches, set manual observations, and request a market-data refresh.

#### Scenario: Create a transaction through MCP
- **WHEN** the authenticated owner calls the transaction tool with valid exact-decimal inputs
- **THEN** the server persists the event and returns the affected account and holding state

#### Scenario: Invalid write arguments
- **WHEN** a write tool receives an unknown identifier, malformed currency, invalid decimal, or out-of-range batch
- **THEN** it returns a structured validation error and makes no persistent change

### Requirement: MCP-only programmatic writes
The system SHALL not expose a parallel general-purpose REST or unauthenticated mutation API for portfolio data.

#### Scenario: Probe an unconfigured mutation route
- **WHEN** a client attempts to mutate portfolio data outside the authenticated MCP surface or internal web actions
- **THEN** no public mutation handler is available

