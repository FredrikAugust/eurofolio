import type { InstrumentRow } from "@/server/db/schema";

export type SecurityPriceObservation = {
  instrumentId: string;
  provider: string;
  price: string;
  currency: string;
  observedOn: string;
  retrievedAt: string;
  rawMetadata?: Record<string, unknown>;
};

export type FxObservation = {
  baseCurrency: "EUR";
  quoteCurrency: string;
  provider: string;
  rate: string;
  observedOn: string;
  retrievedAt: string;
  rawMetadata?: Record<string, unknown>;
};

export type SymbolSearchResult = {
  provider: string;
  symbol: string;
  name: string;
  exchange?: string;
  assetClass: "stock" | "etf" | "fund" | "bond" | "other";
};

export interface SecurityPriceProvider {
  readonly id: string;
  search(query: string): Promise<SymbolSearchResult[]>;
  fetchPrice(instrument: InstrumentRow): Promise<SecurityPriceObservation>;
}

export interface FxProvider {
  readonly id: string;
  fetchLatest(): Promise<FxObservation[]>;
}
