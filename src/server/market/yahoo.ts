import YahooFinance from "yahoo-finance2";

import { positiveDecimal } from "@/server/domain/decimal";
import type {
  SecurityPriceObservation,
  SecurityPriceProvider,
  SymbolSearchResult,
} from "@/server/market/contracts";
import type { InstrumentRow } from "@/server/db/schema";

function assetClass(quoteType?: string): SymbolSearchResult["assetClass"] {
  if (quoteType === "ETF") return "etf";
  if (quoteType === "MUTUALFUND") return "fund";
  if (quoteType === "EQUITY") return "stock";
  return "other";
}

export class YahooProvider implements SecurityPriceProvider {
  readonly id = "yahoo";
  private readonly client: InstanceType<typeof YahooFinance>;

  constructor(client?: InstanceType<typeof YahooFinance>) {
    this.client =
      client ??
      new YahooFinance({
        versionCheck: false,
        suppressNotices: ["yahooSurvey"],
        queue: { concurrency: 2, interval: 100 },
        fetchOptions: { signal: AbortSignal.timeout(8_000) },
      });
  }

  async search(query: string): Promise<SymbolSearchResult[]> {
    const result = await this.client.search(query, { quotesCount: 10, newsCount: 0 });
    return result.quotes
      .filter((quote) => "isYahooFinance" in quote && quote.isYahooFinance)
      .slice(0, 10)
      .map((quote) => ({
        provider: this.id,
        symbol: quote.symbol,
        name:
          ("longname" in quote && quote.longname) ||
          ("shortname" in quote && quote.shortname) ||
          quote.symbol,
        exchange: quote.exchange,
        assetClass: assetClass("quoteType" in quote ? quote.quoteType : undefined),
      }));
  }

  async fetchPrice(instrument: InstrumentRow): Promise<SecurityPriceObservation> {
    const quote = await this.client.quote(instrument.providerSymbol, {
      fields: ["symbol", "regularMarketPrice", "regularMarketTime", "currency"],
    });
    if (!quote.regularMarketPrice || !quote.currency || !quote.regularMarketTime) {
      throw new Error(`Yahoo returned an incomplete quote for ${instrument.providerSymbol}.`);
    }
    return {
      instrumentId: instrument.id,
      provider: this.id,
      price: positiveDecimal(String(quote.regularMarketPrice)),
      currency: quote.currency,
      observedOn: quote.regularMarketTime.toISOString().slice(0, 10),
      retrievedAt: new Date().toISOString(),
      rawMetadata: { symbol: quote.symbol },
    };
  }
}
