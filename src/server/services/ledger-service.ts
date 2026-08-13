import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  accounts,
  instruments,
  ledgerEvents,
  type AccountRow,
  type InstrumentRow,
  type LedgerEventRow,
} from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import { DomainError } from "@/server/domain/errors";
import { LedgerReplayError, replayLedger } from "@/server/domain/ledger";
import {
  accountInputSchema,
  instrumentInputSchema,
  ledgerEventBatchSchema,
  ledgerEventInputSchema,
  validationIssues,
  type AccountInput,
  type InstrumentInput,
  type LedgerEventInput,
} from "@/server/domain/schemas";

function parseOrDomainError<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Input validation failed.",
      validationIssues(result.error),
    );
  }
  return result.data;
}

function toEventRow(
  input: LedgerEventInput,
  now: string,
  id: string = randomUUID(),
): LedgerEventRow {
  return {
    id,
    accountId: input.accountId,
    instrumentId: input.instrumentId ?? null,
    type: input.type,
    effectiveDate: input.effectiveDate,
    currency: input.currency,
    quantity: "quantity" in input ? input.quantity : null,
    unitPrice: "unitPrice" in input ? input.unitPrice : null,
    amount: "amount" in input ? input.amount : null,
    idempotencyKey: input.idempotencyKey ?? null,
    note: input.note ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function translateReplayError(error: unknown): never {
  if (error instanceof LedgerReplayError) {
    throw new DomainError(
      error.code === "UNSUPPORTED_SHORT" ? "UNSUPPORTED_SHORT" : "VALIDATION_ERROR",
      error.message,
      { eventId: error.eventId },
    );
  }
  throw error;
}

export class LedgerService {
  constructor(
    private readonly db: Database,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createAccount(input: AccountInput): Promise<AccountRow> {
    const value = parseOrDomainError(accountInputSchema, input);
    const now = this.now().toISOString();
    const row = {
      id: randomUUID(),
      ...value,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const [created] = await this.db.insert(accounts).values(row).returning();
      return created;
    } catch (error) {
      throw new DomainError("CONFLICT", "An account with this name already exists.", error);
    }
  }

  async listAccounts(includeArchived = false): Promise<AccountRow[]> {
    return this.db
      .select()
      .from(accounts)
      .where(includeArchived ? undefined : isNull(accounts.archivedAt))
      .orderBy(asc(accounts.name));
  }

  async getAccount(id: string): Promise<AccountRow> {
    const [account] = await this.db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!account) throw new DomainError("NOT_FOUND", "Account not found.");
    return account;
  }

  async renameAccount(id: string, name: string): Promise<AccountRow> {
    const parsedName = z.string().trim().min(1).max(120).safeParse(name);
    if (!parsedName.success) {
      throw new DomainError("VALIDATION_ERROR", "Invalid account name.", validationIssues(parsedName.error));
    }
    const [updated] = await this.db
      .update(accounts)
      .set({ name: parsedName.data, updatedAt: this.now().toISOString() })
      .where(eq(accounts.id, id))
      .returning();
    if (!updated) throw new DomainError("NOT_FOUND", "Account not found.");
    return updated;
  }

  async archiveAccount(id: string): Promise<AccountRow> {
    const now = this.now().toISOString();
    const [updated] = await this.db
      .update(accounts)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(accounts.id, id))
      .returning();
    if (!updated) throw new DomainError("NOT_FOUND", "Account not found.");
    return updated;
  }

  async createInstrument(input: InstrumentInput): Promise<InstrumentRow> {
    const value = parseOrDomainError(instrumentInputSchema, input);
    const now = this.now().toISOString();
    try {
      const [created] = await this.db
        .insert(instruments)
        .values({
          id: randomUUID(),
          ...value,
          isin: value.isin ?? null,
          exchange: value.exchange ?? null,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return created;
    } catch (error) {
      throw new DomainError(
        "CONFLICT",
        "This provider symbol is already registered.",
        error,
      );
    }
  }

  async listInstruments(includeArchived = false): Promise<InstrumentRow[]> {
    return this.db
      .select()
      .from(instruments)
      .where(includeArchived ? undefined : isNull(instruments.archivedAt))
      .orderBy(asc(instruments.name));
  }

  async getInstrument(id: string): Promise<InstrumentRow> {
    const [instrument] = await this.db
      .select()
      .from(instruments)
      .where(eq(instruments.id, id))
      .limit(1);
    if (!instrument) throw new DomainError("NOT_FOUND", "Instrument not found.");
    return instrument;
  }

  async archiveInstrument(id: string): Promise<InstrumentRow> {
    const now = this.now().toISOString();
    const [updated] = await this.db
      .update(instruments)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(instruments.id, id))
      .returning();
    if (!updated) throw new DomainError("NOT_FOUND", "Instrument not found.");
    return updated;
  }

  async listEvents(accountId?: string): Promise<LedgerEventRow[]> {
    return this.db
      .select()
      .from(ledgerEvents)
      .where(accountId ? eq(ledgerEvents.accountId, accountId) : undefined)
      .orderBy(
        asc(ledgerEvents.effectiveDate),
        asc(ledgerEvents.createdAt),
        asc(ledgerEvents.id),
      );
  }

  async listEventsPage(options: {
    accountId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: LedgerEventRow[]; nextOffset: number | null }> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const offset = Math.max(options.offset ?? 0, 0);
    const rows = await this.db
      .select()
      .from(ledgerEvents)
      .where(options.accountId ? eq(ledgerEvents.accountId, options.accountId) : undefined)
      .orderBy(
        asc(ledgerEvents.effectiveDate),
        asc(ledgerEvents.createdAt),
        asc(ledgerEvents.id),
      )
      .limit(limit + 1)
      .offset(offset);
    return {
      items: rows.slice(0, limit),
      nextOffset: rows.length > limit ? offset + limit : null,
    };
  }

  private async validateReferences(inputs: readonly LedgerEventInput[]): Promise<void> {
    const accountIds = [...new Set(inputs.map((input) => input.accountId))];
    const instrumentIds = [
      ...new Set(inputs.flatMap((input) => (input.instrumentId ? [input.instrumentId] : []))),
    ];
    const [accountRows, instrumentRows] = await Promise.all([
      this.db.select().from(accounts).where(inArray(accounts.id, accountIds)),
      instrumentIds.length
        ? this.db.select().from(instruments).where(inArray(instruments.id, instrumentIds))
        : Promise.resolve([]),
    ]);
    const accountMap = new Map(accountRows.map((row) => [row.id, row]));
    const instrumentMap = new Map(instrumentRows.map((row) => [row.id, row]));

    for (const input of inputs) {
      const account = accountMap.get(input.accountId);
      if (!account) throw new DomainError("NOT_FOUND", `Account ${input.accountId} not found.`);
      if (account.archivedAt) throw new DomainError("ARCHIVED", "Cannot add events to an archived account.");
      if (input.instrumentId) {
        const instrument = instrumentMap.get(input.instrumentId);
        if (!instrument) {
          throw new DomainError("NOT_FOUND", `Instrument ${input.instrumentId} not found.`);
        }
        if (instrument.archivedAt) {
          throw new DomainError("ARCHIVED", "Cannot add events for an archived instrument.");
        }
      }
    }
  }

  async createEvent(input: LedgerEventInput): Promise<LedgerEventRow> {
    const value = parseOrDomainError(ledgerEventInputSchema, input);
    if (value.idempotencyKey) {
      const [existing] = await this.db
        .select()
        .from(ledgerEvents)
        .where(eq(ledgerEvents.idempotencyKey, value.idempotencyKey))
        .limit(1);
      if (existing) return existing;
    }
    await this.validateReferences([value]);
    const row = toEventRow(value, this.now().toISOString());
    const existing = await this.listEvents();
    try {
      replayLedger([...existing, row]);
    } catch (error) {
      translateReplayError(error);
    }
    const [created] = await this.db.insert(ledgerEvents).values(row).returning();
    return created;
  }

  async ingestEvents(input: LedgerEventInput[]): Promise<LedgerEventRow[]> {
    const values = parseOrDomainError(ledgerEventBatchSchema, input);
    const keys = values.flatMap((value) => value.idempotencyKey ?? []);
    if (new Set(keys).size !== keys.length) {
      throw new DomainError("CONFLICT", "A batch contains duplicate idempotency keys.");
    }
    await this.validateReferences(values);
    const current = await this.listEvents();
    const existingByKey = new Map(
      current.flatMap((event) =>
        event.idempotencyKey ? [[event.idempotencyKey, event] as const] : [],
      ),
    );
    const now = this.now().toISOString();
    const pendingByIndex = new Map<number, LedgerEventRow>();
    values.forEach((value, index) => {
      if (!value.idempotencyKey || !existingByKey.has(value.idempotencyKey)) {
        pendingByIndex.set(index, toEventRow(value, now));
      }
    });
    const pending = [...pendingByIndex.values()];
    try {
      replayLedger([...current, ...pending]);
    } catch (error) {
      translateReplayError(error);
    }
    if (pending.length) {
      const statements = pending.map((row) => this.db.insert(ledgerEvents).values(row));
      await this.db.batch(
        statements as [typeof statements[number], ...typeof statements[number][]],
      );
    }
    const pendingIds = new Set(pending.map((row) => row.id));
    const inserted = pending.length
      ? await this.db.select().from(ledgerEvents).where(inArray(ledgerEvents.id, [...pendingIds]))
      : [];
    const insertedById = new Map(inserted.map((row) => [row.id, row]));
    return values.map((value, index) => {
      if (value.idempotencyKey) {
        const existing = existingByKey.get(value.idempotencyKey);
        if (existing) return existing;
      }
      const id = pendingByIndex.get(index)?.id;
      const row = id ? insertedById.get(id) : undefined;
      if (!row) throw new DomainError("NOT_FOUND", "Inserted event could not be loaded.");
      return row;
    });
  }

  async correctEvent(id: string, input: LedgerEventInput): Promise<LedgerEventRow> {
    const value = parseOrDomainError(ledgerEventInputSchema, input);
    await this.validateReferences([value]);
    const current = await this.listEvents();
    const original = current.find((event) => event.id === id);
    if (!original) throw new DomainError("NOT_FOUND", "Ledger event not found.");
    const replacement = {
      ...toEventRow(value, this.now().toISOString(), id),
      createdAt: original.createdAt,
    };
    try {
      replayLedger(current.map((event) => (event.id === id ? replacement : event)));
    } catch (error) {
      translateReplayError(error);
    }
    const [updated] = await this.db
      .update(ledgerEvents)
      .set(replacement)
      .where(eq(ledgerEvents.id, id))
      .returning();
    return updated;
  }

  async deleteEvent(id: string): Promise<LedgerEventRow> {
    const current = await this.listEvents();
    const original = current.find((event) => event.id === id);
    if (!original) throw new DomainError("NOT_FOUND", "Ledger event not found.");
    try {
      replayLedger(current.filter((event) => event.id !== id));
    } catch (error) {
      translateReplayError(error);
    }
    const [deleted] = await this.db
      .delete(ledgerEvents)
      .where(and(eq(ledgerEvents.id, id)))
      .returning();
    return deleted;
  }
}
