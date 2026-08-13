import "server-only";

import { cacheLife, cacheTag, revalidateTag } from "next/cache";

import { getDatabase } from "@/server/db/client";
import { queryPortfolioDashboard } from "@/server/services/portfolio-query";
import { queryActivityRegister, queryDataRegister } from "@/server/services/read-pages";
import { getPortfolioOptions } from "@/server/services/services";

const PORTFOLIO_CACHE_TAG = "eurofolio:portfolio";

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
  return queryPortfolioDashboard(getDatabase(), valuationDate, getPortfolioOptions());
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
