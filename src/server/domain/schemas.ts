import { z } from "zod";

import { positiveDecimal } from "@/server/domain/decimal";

const identifierSchema = z.uuid();
export const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Expected an uppercase ISO 4217 currency code");
export const financialDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date");

const positiveDecimalSchema = z.string().transform((value, context) => {
  try {
    return positiveDecimal(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Invalid positive decimal",
    });
    return z.NEVER;
  }
});

export const accountInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  institution: z.string().trim().max(120).default(""),
  defaultCurrency: currencySchema,
});

export const instrumentInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  assetClass: z.enum(["stock", "etf", "fund", "bond", "cash", "other"]),
  nativeCurrency: currencySchema,
  provider: z.string().trim().min(1).max(40),
  providerSymbol: z.string().trim().min(1).max(80),
  isin: z.string().trim().min(12).max(12).optional(),
  exchange: z.string().trim().max(80).optional(),
});

const eventBase = {
  accountId: identifierSchema,
  effectiveDate: financialDateSchema,
  currency: currencySchema,
  idempotencyKey: z.string().trim().min(1).max(160).optional(),
  note: z.string().trim().max(500).optional(),
};

const tradeEventSchema = z.object({
  ...eventBase,
  type: z.enum(["buy", "sell"]),
  instrumentId: identifierSchema,
  quantity: positiveDecimalSchema,
  unitPrice: positiveDecimalSchema,
});

const securityTransferEventSchema = z.object({
  ...eventBase,
  type: z.enum(["transfer_in", "transfer_out"]),
  instrumentId: identifierSchema,
  quantity: positiveDecimalSchema,
});

const cashEventSchema = z.object({
  ...eventBase,
  type: z.enum(["deposit", "withdrawal", "dividend", "fee", "tax"]),
  instrumentId: identifierSchema.optional(),
  amount: positiveDecimalSchema,
});

export const ledgerEventInputSchema = z.discriminatedUnion("type", [
  tradeEventSchema,
  securityTransferEventSchema,
  cashEventSchema,
]);

export const ledgerEventBatchSchema = z
  .array(ledgerEventInputSchema)
  .min(1)
  .max(100);

export type AccountInput = z.infer<typeof accountInputSchema>;
export type InstrumentInput = z.infer<typeof instrumentInputSchema>;
export type LedgerEventInput = z.infer<typeof ledgerEventInputSchema>;

export type ValidationIssue = {
  code: "VALIDATION_ERROR";
  path: string;
  message: string;
};

export function validationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    code: "VALIDATION_ERROR",
    path: issue.path.join("."),
    message: issue.message,
  }));
}
