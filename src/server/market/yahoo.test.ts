import assert from "node:assert/strict";
import test from "node:test";
import YahooFinance from "yahoo-finance2";

import type { InstrumentRow } from "@/server/db/schema";
import { YahooProvider } from "@/server/market/yahoo";

const client = {
  search: async () => ({
    quotes: [
      {
        isYahooFinance: true,
        symbol: "VWCE.DE",
        longname: "Vanguard FTSE All-World UCITS ETF",
        exchange: "GER",
        quoteType: "ETF",
      },
    ],
  }),
  quote: async () => ({
    symbol: "VWCE.DE",
    regularMarketPrice: 141.25,
    regularMarketTime: new Date("2026-08-11T16:30:00.000Z"),
    currency: "EUR",
  }),
} as unknown as InstanceType<typeof YahooFinance>;

const instrument: InstrumentRow = {
  id: "instrument",
  name: "World ETF",
  assetClass: "etf",
  nativeCurrency: "EUR",
  provider: "yahoo",
  providerSymbol: "VWCE.DE",
  isin: null,
  exchange: "GER",
  archivedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

test("Yahoo adapter normalizes search and delayed quote fixtures", async () => {
  const provider = new YahooProvider(client);
  const search = await provider.search("VWCE");
  assert.equal(search[0].assetClass, "etf");
  assert.equal(search[0].symbol, "VWCE.DE");
  const quote = await provider.fetchPrice(instrument);
  assert.equal(quote.price, "141.25");
  assert.equal(quote.observedOn, "2026-08-11");
});
