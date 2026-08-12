import { z } from "zod";

import { positiveDecimal } from "@/server/domain/decimal";
import { fetchWithTimeout } from "@/server/market/fetch";
import type { FxObservation, FxProvider } from "@/server/market/contracts";

const ECB_URL =
  "https://data-api.ecb.europa.eu/service/data/EXR/D..EUR.SP00.A?lastNObservations=1&format=csvdata";

const rowSchema = z.object({
  CURRENCY: z.string().regex(/^[A-Z]{3}$/),
  CURRENCY_DENOM: z.literal("EUR"),
  TIME_PERIOD: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  OBS_VALUE: z.string(),
});

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      fields.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  fields.push(value);
  return fields;
}

export function parseEcbCsv(csv: string, retrievedAt: string): FxObservation[] {
  const lines = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0] ?? "");
  const required = ["CURRENCY", "CURRENCY_DENOM", "TIME_PERIOD", "OBS_VALUE"];
  if (!required.every((header) => headers.includes(header))) {
    throw new Error("ECB response is missing required columns.");
  }
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    const raw = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const row = rowSchema.parse(raw);
    return {
      baseCurrency: "EUR" as const,
      quoteCurrency: row.CURRENCY,
      provider: "ecb",
      rate: positiveDecimal(row.OBS_VALUE),
      observedOn: row.TIME_PERIOD,
      retrievedAt,
      rawMetadata: { series: `EXR.D.${row.CURRENCY}.EUR.SP00.A` },
    };
  });
}

export class EcbProvider implements FxProvider {
  readonly id = "ecb";

  constructor(private readonly request: typeof fetchWithTimeout = fetchWithTimeout) {}

  async fetchLatest(): Promise<FxObservation[]> {
    const retrievedAt = new Date().toISOString();
    const response = await this.request(
      ECB_URL,
      { headers: { Accept: "text/csv" } },
      8_000,
    );
    if (!response.ok) throw new Error(`ECB request failed with ${response.status}.`);
    return parseEcbCsv(await response.text(), retrievedAt);
  }
}
