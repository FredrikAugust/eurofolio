PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ledger_events` (
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
	CONSTRAINT "ledger_events_date_check" CHECK("__new_ledger_events"."effective_date" GLOB '????-??-??'),
	CONSTRAINT "ledger_events_currency_check" CHECK("__new_ledger_events"."currency" GLOB '[A-Z][A-Z][A-Z]'),
	CONSTRAINT "ledger_events_shape_check" CHECK((("__new_ledger_events"."type" IN ('buy', 'sell')) AND "__new_ledger_events"."instrument_id" IS NOT NULL AND "__new_ledger_events"."quantity" IS NOT NULL AND "__new_ledger_events"."unit_price" IS NOT NULL AND "__new_ledger_events"."amount" IS NULL) OR (("__new_ledger_events"."type" IN ('transfer_in', 'transfer_out')) AND "__new_ledger_events"."instrument_id" IS NOT NULL AND "__new_ledger_events"."quantity" IS NOT NULL AND "__new_ledger_events"."unit_price" IS NULL AND "__new_ledger_events"."amount" IS NULL) OR (("__new_ledger_events"."type" NOT IN ('buy', 'sell', 'transfer_in', 'transfer_out')) AND "__new_ledger_events"."quantity" IS NULL AND "__new_ledger_events"."unit_price" IS NULL AND "__new_ledger_events"."amount" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_ledger_events`("id", "account_id", "instrument_id", "type", "effective_date", "currency", "quantity", "unit_price", "amount", "idempotency_key", "note", "created_at", "updated_at") SELECT "id", "account_id", "instrument_id", "type", "effective_date", "currency", "quantity", "unit_price", "amount", "idempotency_key", "note", "created_at", "updated_at" FROM `ledger_events`;--> statement-breakpoint
DROP TABLE `ledger_events`;--> statement-breakpoint
ALTER TABLE `__new_ledger_events` RENAME TO `ledger_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_events_idempotency_unique` ON `ledger_events` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `ledger_events_replay_idx` ON `ledger_events` (`account_id`,`effective_date`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `ledger_events_instrument_idx` ON `ledger_events` (`instrument_id`,`effective_date`);