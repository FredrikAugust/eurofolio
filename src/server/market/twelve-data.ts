import { z } from "zod";

import type { InstrumentRow } from "@/server/db/schema";
import { positiveDecimal } from "@/server/domain/decimal";
import type {
  SecurityPriceObservation,
  SecurityPriceProvider,
  SymbolSearchResult,
} from "@/server/market/contracts";
import { fetchWithTimeout } from "@/server/market/fetch";

const priceResponseSchema = z.object({ price: z.string() });
const searchResponseSchema = z.object({
  data: z.array(
    z.object({
      symbol: z.string(),
      instrument_name: z.string(),
      exchange: z.string().optional(),
      instrument_type: z.string().optional(),
    }),
  ),
});

export class TwelveDataProvider implements SecurityPriceProvider {
  readonly id = "twelve-data";

  constructor(private readonly apiKey: string) {}

  async search(query: string): Promise<SymbolSearchResult[]> {
    const url = new URL("https://api.twelvedata.com/symbol_search");
    url.searchParams.set("symbol", query);
    url.searchParams.set("apikey", this.apiKey);
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`Twelve Data search failed with ${response.status}.`);
    return searchResponseSchema.parse(await response.json()).data.slice(0, 10).map((item) => ({
      provider: this.id,
      symbol: item.symbol,
      name: item.instrument_name,
      exchange: item.exchange,
      assetClass: item.instrument_type?.toLowerCase().includes("etf") ? "etf" : "stock",
    }));
  }

  async fetchPrice(instrument: InstrumentRow): Promise<SecurityPriceObservation> {
    const url = new URL("https://api.twelvedata.com/price");
    url.searchParams.set("symbol", instrument.providerSymbol);
    url.searchParams.set("apikey", this.apiKey);
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`Twelve Data quote failed with ${response.status}.`);
    const result = priceResponseSchema.parse(await response.json());
    const now = new Date().toISOString();
    return {
      instrumentId: instrument.id,
      provider: this.id,
      price: positiveDecimal(result.price),
      currency: instrument.nativeCurrency,
      observedOn: now.slice(0, 10),
      retrievedAt: now,
      rawMetadata: { symbol: instrument.providerSymbol },
    };
  }
}
