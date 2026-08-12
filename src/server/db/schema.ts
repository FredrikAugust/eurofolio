import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const financialDateCheck = (column: ReturnType<typeof text>) =>
  sql`${column} GLOB '????-??-??'`;
const currencyCheck = (column: ReturnType<typeof text>) =>
  sql`${column} GLOB '[A-Z][A-Z][A-Z]'`;

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    institution: text("institution").notNull().default(""),
    defaultCurrency: text("default_currency").notNull(),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("accounts_name_unique").on(table.name),
    check("accounts_currency_check", currencyCheck(table.defaultCurrency)),
    index("accounts_archive_idx").on(table.archivedAt, table.name),
  ],
);

export const instruments = sqliteTable(
  "instruments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    assetClass: text("asset_class", {
      enum: ["stock", "etf", "fund", "bond", "cash", "other"],
    }).notNull(),
    nativeCurrency: text("native_currency").notNull(),
    provider: text("provider").notNull(),
    providerSymbol: text("provider_symbol").notNull(),
    isin: text("isin"),
    exchange: text("exchange"),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("instruments_provider_symbol_unique").on(
      table.provider,
      table.providerSymbol,
    ),
    check("instruments_currency_check", currencyCheck(table.nativeCurrency)),
    index("instruments_archive_idx").on(table.archivedAt, table.name),
    index("instruments_isin_idx").on(table.isin),
  ],
);

export const ledgerEvents = sqliteTable(
  "ledger_events",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    instrumentId: text("instrument_id").references(() => instruments.id, {
      onDelete: "restrict",
    }),
    type: text("type", {
      enum: [
        "buy",
        "sell",
        "deposit",
        "withdrawal",
        "dividend",
        "fee",
        "tax",
      ],
    }).notNull(),
    effectiveDate: text("effective_date").notNull(),
    currency: text("currency").notNull(),
    quantity: text("quantity"),
    unitPrice: text("unit_price"),
    amount: text("amount"),
    idempotencyKey: text("idempotency_key"),
    note: text("note"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("ledger_events_idempotency_unique").on(table.idempotencyKey),
    check("ledger_events_date_check", financialDateCheck(table.effectiveDate)),
    check("ledger_events_currency_check", currencyCheck(table.currency)),
    check(
      "ledger_events_shape_check",
      sql`((${table.type} IN ('buy', 'sell')) AND ${table.instrumentId} IS NOT NULL AND ${table.quantity} IS NOT NULL AND ${table.unitPrice} IS NOT NULL AND ${table.amount} IS NULL) OR ((${table.type} NOT IN ('buy', 'sell')) AND ${table.quantity} IS NULL AND ${table.unitPrice} IS NULL AND ${table.amount} IS NOT NULL)`,
    ),
    index("ledger_events_replay_idx").on(
      table.accountId,
      table.effectiveDate,
      table.createdAt,
      table.id,
    ),
    index("ledger_events_instrument_idx").on(
      table.instrumentId,
      table.effectiveDate,
    ),
  ],
);

export const securityPrices = sqliteTable(
  "security_prices",
  {
    id: text("id").primaryKey(),
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    price: text("price").notNull(),
    currency: text("currency").notNull(),
    observedOn: text("observed_on").notNull(),
    retrievedAt: text("retrieved_at").notNull(),
    isManual: integer("is_manual", { mode: "boolean" }).notNull().default(false),
    reason: text("reason"),
    rawMetadata: text("raw_metadata"),
  },
  (table) => [
    uniqueIndex("security_prices_observation_unique").on(
      table.instrumentId,
      table.provider,
      table.observedOn,
    ),
    check("security_prices_currency_check", currencyCheck(table.currency)),
    check("security_prices_date_check", financialDateCheck(table.observedOn)),
    index("security_prices_selection_idx").on(
      table.instrumentId,
      table.observedOn,
      table.isManual,
    ),
  ],
);

export const fxRates = sqliteTable(
  "fx_rates",
  {
    id: text("id").primaryKey(),
    baseCurrency: text("base_currency").notNull().default("EUR"),
    quoteCurrency: text("quote_currency").notNull(),
    provider: text("provider").notNull(),
    rate: text("rate").notNull(),
    observedOn: text("observed_on").notNull(),
    retrievedAt: text("retrieved_at").notNull(),
    isManual: integer("is_manual", { mode: "boolean" }).notNull().default(false),
    reason: text("reason"),
    rawMetadata: text("raw_metadata"),
  },
  (table) => [
    uniqueIndex("fx_rates_observation_unique").on(
      table.baseCurrency,
      table.quoteCurrency,
      table.provider,
      table.observedOn,
    ),
    check("fx_rates_base_check", sql`${table.baseCurrency} = 'EUR'`),
    check("fx_rates_quote_check", currencyCheck(table.quoteCurrency)),
    check("fx_rates_date_check", financialDateCheck(table.observedOn)),
    index("fx_rates_selection_idx").on(
      table.quoteCurrency,
      table.observedOn,
      table.isManual,
    ),
  ],
);

export const refreshRuns = sqliteTable(
  "refresh_runs",
  {
    id: text("id").primaryKey(),
    status: text("status", {
      enum: ["running", "complete", "partial", "failed"],
    }).notNull(),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    attempted: integer("attempted").notNull().default(0),
    succeeded: integer("succeeded").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    errors: text("errors"),
  },
  (table) => [index("refresh_runs_started_idx").on(table.startedAt)],
);

// Better Auth's core schema. Singular table names intentionally avoid the
// portfolio `accounts` table above and match the adapter's canonical models.
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export type AccountRow = typeof accounts.$inferSelect;
export type InstrumentRow = typeof instruments.$inferSelect;
export type LedgerEventRow = typeof ledgerEvents.$inferSelect;
export type SecurityPriceRow = typeof securityPrices.$inferSelect;
export type FxRateRow = typeof fxRates.$inferSelect;
