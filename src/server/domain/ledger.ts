import {
  add,
  compare,
  multiply,
  subtract,
} from "@/server/domain/decimal";

export type ReplayEvent = {
  id: string;
  accountId: string;
  instrumentId: string | null;
  type: "buy" | "sell" | "deposit" | "withdrawal" | "dividend" | "fee" | "tax";
  effectiveDate: string;
  currency: string;
  quantity: string | null;
  unitPrice: string | null;
  amount: string | null;
  createdAt: string;
};

export class LedgerReplayError extends Error {
  constructor(
    readonly code: "UNSUPPORTED_SHORT" | "INVALID_EVENT_SHAPE",
    message: string,
    readonly eventId: string,
  ) {
    super(message);
    this.name = "LedgerReplayError";
  }
}

export type LedgerProjection = {
  cash: Map<string, string>;
  holdings: Map<string, string>;
};

const cashKey = (event: ReplayEvent) => `${event.accountId}:${event.currency}`;
const holdingKey = (event: ReplayEvent) =>
  `${event.accountId}:${event.instrumentId ?? ""}`;

export function replayLedger(events: readonly ReplayEvent[]): LedgerProjection {
  const cash = new Map<string, string>();
  const holdings = new Map<string, string>();
  const ordered = [...events].sort(
    (left, right) =>
      left.effectiveDate.localeCompare(right.effectiveDate) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );

  for (const event of ordered) {
    const currentCash = cash.get(cashKey(event)) ?? "0";

    if (event.type === "buy" || event.type === "sell") {
      if (!event.instrumentId || !event.quantity || !event.unitPrice) {
        throw new LedgerReplayError(
          "INVALID_EVENT_SHAPE",
          "Trade events require instrument, quantity, and unit price.",
          event.id,
        );
      }
      const key = holdingKey(event);
      const currentQuantity = holdings.get(key) ?? "0";
      const cashValue = multiply(event.quantity, event.unitPrice);
      if (event.type === "buy") {
        holdings.set(key, add(currentQuantity, event.quantity));
        cash.set(cashKey(event), subtract(currentCash, cashValue));
      } else {
        if (compare(currentQuantity, event.quantity) < 0) {
          throw new LedgerReplayError(
            "UNSUPPORTED_SHORT",
            "Sell would reduce the holding below zero.",
            event.id,
          );
        }
        holdings.set(key, subtract(currentQuantity, event.quantity));
        cash.set(cashKey(event), add(currentCash, cashValue));
      }
      continue;
    }

    if (!event.amount) {
      throw new LedgerReplayError(
        "INVALID_EVENT_SHAPE",
        "Cash events require an amount.",
        event.id,
      );
    }
    const increasesCash = event.type === "deposit" || event.type === "dividend";
    cash.set(
      cashKey(event),
      increasesCash
        ? add(currentCash, event.amount)
        : subtract(currentCash, event.amount),
    );
  }

  return { cash, holdings };
}
