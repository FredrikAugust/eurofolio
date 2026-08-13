import { timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { getEnvironment } from "@/server/env";
import { invalidatePortfolioReadCache } from "@/server/services/cached-queries";
import { getMarketService } from "@/server/services/services";

export const maxDuration = 300;

const bodySchema = z.object({
  startOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function matches(left: string, right: string): boolean {
  const leftDigest = Buffer.from(left);
  const rightDigest = Buffer.from(right);
  return leftDigest.length === rightDigest.length && timingSafeEqual(leftDigest, rightDigest);
}

export async function POST(request: Request): Promise<Response> {
  const secret = getEnvironment().BACKFILL_SECRET;
  if (!secret) return Response.json({ error: "Not found" }, { status: 404 });
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!matches(token, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = bodySchema.parse(await request.json());
  const result = await getMarketService().backfill(body.startOn, body.endOn);
  invalidatePortfolioReadCache();
  return Response.json(result);
}
