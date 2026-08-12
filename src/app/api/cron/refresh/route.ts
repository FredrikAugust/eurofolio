import { timingSafeEqual } from "node:crypto";

import { getEnvironment } from "@/server/env";
import { getMarketService } from "@/server/services/services";

function matches(left: string, right: string): boolean {
  const leftDigest = Buffer.from(left);
  const rightDigest = Buffer.from(right);
  return leftDigest.length === rightDigest.length && timingSafeEqual(leftDigest, rightDigest);
}

export async function GET(request: Request): Promise<Response> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!matches(token, getEnvironment().CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await getMarketService().refresh();
  return Response.json(result);
}
