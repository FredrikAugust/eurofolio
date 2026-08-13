import "server-only";

import { getDatabase } from "@/server/db/client";
import { getEnvironment } from "@/server/env";
import type { SecurityPriceProvider } from "@/server/market/contracts";
import { EcbProvider } from "@/server/market/ecb";
import { TwelveDataProvider } from "@/server/market/twelve-data";
import { YahooProvider } from "@/server/market/yahoo";
import { LedgerService } from "@/server/services/ledger-service";
import { MarketService } from "@/server/services/market-service";

export function getLedgerService(): LedgerService {
  return new LedgerService(getDatabase());
}

export function getMarketService(): MarketService {
  const environment = getEnvironment();
  const providers = new Map<string, SecurityPriceProvider>([["yahoo", new YahooProvider()]]);
  if (environment.TWELVE_DATA_API_KEY) {
    providers.set("twelve-data", new TwelveDataProvider(environment.TWELVE_DATA_API_KEY));
  }
  return new MarketService(getDatabase(), providers, new EcbProvider());
}

export function getPortfolioOptions() {
  const environment = getEnvironment();
  return {
    priceStaleAfterDays: environment.PRICE_STALE_AFTER_DAYS,
    fxStaleAfterDays: environment.FX_STALE_AFTER_DAYS,
  };
}
