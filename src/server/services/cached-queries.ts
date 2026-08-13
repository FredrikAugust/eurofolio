import "server-only";

import { cacheLife, cacheTag, revalidateTag } from "next/cache";

import { getDatabase } from "@/server/db/client";
import { getEnvironment } from "@/server/env";
import { queryPortfolioDashboard } from "@/server/services/portfolio-query";
import { queryActivityRegister, queryDataRegister } from "@/server/services/read-pages";

export const PORTFOLIO_CACHE_TAG = "eurofolio:portfolio";

function portfolioCachePolicy() {
  cacheLife({
    stale: 300,
    revalidate: 21_600,
    expire: 86_400,
  });
  cacheTag(PORTFOLIO_CACHE_TAG);
}

export async function getCachedPortfolioDashboard(valuationDate: string) {
  "use cache";
  portfolioCachePolicy();
  const environment = getEnvironment();
  return queryPortfolioDashboard(getDatabase(), valuationDate, {
    priceStaleAfterDays: environment.PRICE_STALE_AFTER_DAYS,
    fxStaleAfterDays: environment.FX_STALE_AFTER_DAYS,
  });
}

export async function getCachedActivityRegister() {
  "use cache";
  portfolioCachePolicy();
  return queryActivityRegister(getDatabase());
}

export async function getCachedDataRegister() {
  "use cache";
  portfolioCachePolicy();
  return queryDataRegister(getDatabase());
}

export function invalidatePortfolioReadCache(): void {
  revalidateTag(PORTFOLIO_CACHE_TAG, { expire: 0 });
}
