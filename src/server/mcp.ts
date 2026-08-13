import "server-only";

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { getDatabase } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import {
  accountInputSchema,
  financialDateSchema,
  instrumentInputSchema,
  ledgerEventBatchSchema,
  ledgerEventInputSchema,
} from "@/server/domain/schemas";
import { invalidatePortfolioReadCache } from "@/server/services/cached-queries";
import { getLedgerService, getMarketService, getPortfolioOptions } from "@/server/services/services";
import { queryPortfolio } from "@/server/services/portfolio-query";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

async function tool<T>(operation: () => Promise<T>) {
  try {
    return result(await operation());
  } catch (error) {
    const payload =
      error instanceof DomainError
        ? { code: error.code, message: error.message, details: error.details }
        : { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" };
    return { ...result(payload), isError: true };
  }
}

async function mutation<T>(operation: () => Promise<T>) {
  return tool(async () => {
    const value = await operation();
    invalidatePortfolioReadCache();
    return value;
  });
}

const pagination = {
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
};

function paginate<T>(items: readonly T[], limit: number, offset: number) {
  return {
    items: items.slice(offset, offset + limit),
    nextOffset: items.length > offset + limit ? offset + limit : null,
  };
}

function portfolioSummary(valuationDate: string) {
  return queryPortfolio(getDatabase(), valuationDate, getPortfolioOptions());
}

export const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_accounts",
      { description: "List portfolio accounts with bounded pagination.", inputSchema: z.object({ includeArchived: z.boolean().default(false), ...pagination }) },
      ({ includeArchived, limit, offset }) => tool(async () => {
        const rows = await getLedgerService().listAccounts(includeArchived);
        return paginate(rows, limit, offset);
      }),
    );
    server.registerTool(
      "list_instruments",
      { description: "List registered instruments with bounded pagination.", inputSchema: z.object({ includeArchived: z.boolean().default(false), ...pagination }) },
      ({ includeArchived, limit, offset }) => tool(async () => {
        const rows = await getLedgerService().listInstruments(includeArchived);
        return paginate(rows, limit, offset);
      }),
    );
    server.registerTool(
      "search_instruments",
      { description: "Search free delayed market-data providers before registering an instrument.", inputSchema: z.object({ query: z.string().trim().min(1).max(80), provider: z.enum(["yahoo", "twelve-data"]).default("yahoo") }) },
      ({ query, provider }) => tool(() => getMarketService().search(query, provider)),
    );
    server.registerTool(
      "list_ledger_events",
      {
        description: "List ledger events with bounded pagination.",
        inputSchema: z.object({ accountId: z.uuid().optional(), ...pagination }),
      },
      (input) => tool(() => getLedgerService().listEventsPage(input)),
    );
    server.registerTool(
      "portfolio_summary",
      {
        description: "Return the exact EUR portfolio summary and completeness diagnostics.",
        inputSchema: z.object({ valuationDate: financialDateSchema.default(today()) }),
      },
      ({ valuationDate }) => tool(() => portfolioSummary(valuationDate)),
    );
    server.registerTool(
      "list_holdings",
      {
        description: "List current holdings and native/EUR values.",
        inputSchema: z.object({ valuationDate: financialDateSchema.default(today()), ...pagination }),
      },
      ({ valuationDate, limit, offset }) =>
        tool(async () => {
          const summary = await portfolioSummary(valuationDate);
          return paginate(summary.holdings, limit, offset);
        }),
    );
    server.registerTool(
      "data_freshness",
      {
        description: "Inspect provider dates, stale observations, manual overrides, and gaps.",
        inputSchema: z.object({ valuationDate: financialDateSchema.default(today()) }),
      },
      ({ valuationDate }) =>
        tool(async () => {
          const summary = await portfolioSummary(valuationDate);
          return { holdings: summary.holdings, cash: summary.cash, missing: summary.missing };
        }),
    );
    server.registerTool(
      "create_account",
      { description: "Create a portfolio account.", inputSchema: accountInputSchema },
      (input) => mutation(() => getLedgerService().createAccount(input)),
    );
    server.registerTool(
      "archive_account",
      { description: "Archive an account while preserving history.", inputSchema: z.object({ id: z.uuid() }) },
      ({ id }) => mutation(() => getLedgerService().archiveAccount(id)),
    );
    server.registerTool(
      "register_instrument",
      { description: "Register a listed instrument.", inputSchema: instrumentInputSchema },
      (input) => mutation(() => getLedgerService().createInstrument(input)),
    );
    server.registerTool(
      "archive_instrument",
      { description: "Archive an instrument while preserving history.", inputSchema: z.object({ id: z.uuid() }) },
      ({ id }) => mutation(() => getLedgerService().archiveInstrument(id)),
    );
    server.registerTool(
      "create_ledger_event",
      { description: "Create one exact ledger event.", inputSchema: ledgerEventInputSchema },
      (input) => mutation(() => getLedgerService().createEvent(input)),
    );
    server.registerTool(
      "correct_ledger_event",
      {
        description: "Replace an existing ledger event and replay affected holdings.",
        inputSchema: z.object({ id: z.uuid(), event: ledgerEventInputSchema }),
      },
      ({ id, event }) => mutation(() => getLedgerService().correctEvent(id, event)),
    );
    server.registerTool(
      "delete_ledger_event",
      { description: "Delete an event and replay affected holdings.", inputSchema: z.object({ id: z.uuid() }) },
      ({ id }) => mutation(() => getLedgerService().deleteEvent(id)),
    );
    server.registerTool(
      "ingest_ledger_events",
      { description: "Atomically ingest up to 100 exact ledger events.", inputSchema: z.object({ events: ledgerEventBatchSchema }) },
      ({ events }) => mutation(() => getLedgerService().ingestEvents(events)),
    );
    server.registerTool(
      "set_manual_price",
      {
        description: "Set an exact manual security price with reason metadata.",
        inputSchema: z.object({
          instrumentId: z.uuid(),
          price: z.string(),
          currency: z.string().regex(/^[A-Z]{3}$/),
          observedOn: financialDateSchema,
          reason: z.string().min(1).max(500),
        }),
      },
      (input) => mutation(() => getMarketService().setManualPrice(input)),
    );
    server.registerTool(
      "set_manual_fx",
      {
        description: "Set foreign-currency units per EUR with reason metadata.",
        inputSchema: z.object({
          quoteCurrency: z.string().regex(/^[A-Z]{3}$/),
          rate: z.string(),
          observedOn: financialDateSchema,
          reason: z.string().min(1).max(500),
        }),
      },
      (input) => mutation(() => getMarketService().setManualFx(input)),
    );
    server.registerTool(
      "refresh_market_data",
      { description: "Refresh ECB FX and delayed security prices with per-item results.", inputSchema: z.object({}) },
      () => mutation(() => getMarketService().refresh()),
    );
  },
  {
    serverInfo: { name: "eurofolio", version: "0.1.0" },
    instructions: "Private single-owner EUR portfolio ledger. Exact decimal inputs are strings.",
    verboseLogs: false,
  },
);
