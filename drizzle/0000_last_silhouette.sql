CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`institution` text DEFAULT '' NOT NULL,
	`default_currency` text NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "accounts_currency_check" CHECK("accounts"."default_currency" GLOB '[A-Z][A-Z][A-Z]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_name_unique` ON `accounts` (`name`);--> statement-breakpoint
CREATE INDEX `accounts_archive_idx` ON `accounts` (`archived_at`,`name`);--> statement-breakpoint
CREATE TABLE `fx_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`base_currency` text DEFAULT 'EUR' NOT NULL,
	`quote_currency` text NOT NULL,
	`provider` text NOT NULL,
	`rate` text NOT NULL,
	`observed_on` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`is_manual` integer DEFAULT false NOT NULL,
	`reason` text,
	`raw_metadata` text,
	CONSTRAINT "fx_rates_base_check" CHECK("fx_rates"."base_currency" = 'EUR'),
	CONSTRAINT "fx_rates_quote_check" CHECK("fx_rates"."quote_currency" GLOB '[A-Z][A-Z][A-Z]'),
	CONSTRAINT "fx_rates_date_check" CHECK("fx_rates"."observed_on" GLOB '????-??-??')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fx_rates_observation_unique` ON `fx_rates` (`base_currency`,`quote_currency`,`provider`,`observed_on`);--> statement-breakpoint
CREATE INDEX `fx_rates_selection_idx` ON `fx_rates` (`quote_currency`,`observed_on`,`is_manual`);--> statement-breakpoint
CREATE TABLE `instruments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`asset_class` text NOT NULL,
	`native_currency` text NOT NULL,
	`provider` text NOT NULL,
	`provider_symbol` text NOT NULL,
	`isin` text,
	`exchange` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "instruments_currency_check" CHECK("instruments"."native_currency" GLOB '[A-Z][A-Z][A-Z]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instruments_provider_symbol_unique` ON `instruments` (`provider`,`provider_symbol`);--> statement-breakpoint
CREATE INDEX `instruments_archive_idx` ON `instruments` (`archived_at`,`name`);--> statement-breakpoint
CREATE INDEX `instruments_isin_idx` ON `instruments` (`isin`);--> statement-breakpoint
CREATE TABLE `ledger_events` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`instrument_id` text,
	`type` text NOT NULL,
	`effective_date` text NOT NULL,
	`currency` text NOT NULL,
	`quantity` text,
	`unit_price` text,
	`amount` text,
	`idempotency_key` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`instrument_id`) REFERENCES `instruments`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ledger_events_date_check" CHECK("ledger_events"."effective_date" GLOB '????-??-??'),
	CONSTRAINT "ledger_events_currency_check" CHECK("ledger_events"."currency" GLOB '[A-Z][A-Z][A-Z]'),
	CONSTRAINT "ledger_events_shape_check" CHECK((("ledger_events"."type" IN ('buy', 'sell')) AND "ledger_events"."instrument_id" IS NOT NULL AND "ledger_events"."quantity" IS NOT NULL AND "ledger_events"."unit_price" IS NOT NULL AND "ledger_events"."amount" IS NULL) OR (("ledger_events"."type" NOT IN ('buy', 'sell')) AND "ledger_events"."quantity" IS NULL AND "ledger_events"."unit_price" IS NULL AND "ledger_events"."amount" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_events_idempotency_unique` ON `ledger_events` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `ledger_events_replay_idx` ON `ledger_events` (`account_id`,`effective_date`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `ledger_events_instrument_idx` ON `ledger_events` (`instrument_id`,`effective_date`);--> statement-breakpoint
CREATE TABLE `refresh_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`attempted` integer DEFAULT 0 NOT NULL,
	`succeeded` integer DEFAULT 0 NOT NULL,
	`failed` integer DEFAULT 0 NOT NULL,
	`errors` text
);
--> statement-breakpoint
CREATE INDEX `refresh_runs_started_idx` ON `refresh_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `security_prices` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_id` text NOT NULL,
	`provider` text NOT NULL,
	`price` text NOT NULL,
	`currency` text NOT NULL,
	`observed_on` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`is_manual` integer DEFAULT false NOT NULL,
	`reason` text,
	`raw_metadata` text,
	FOREIGN KEY (`instrument_id`) REFERENCES `instruments`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "security_prices_currency_check" CHECK("security_prices"."currency" GLOB '[A-Z][A-Z][A-Z]'),
	CONSTRAINT "security_prices_date_check" CHECK("security_prices"."observed_on" GLOB '????-??-??')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_prices_observation_unique` ON `security_prices` (`instrument_id`,`provider`,`observed_on`);--> statement-breakpoint
CREATE INDEX `security_prices_selection_idx` ON `security_prices` (`instrument_id`,`observed_on`,`is_manual`);