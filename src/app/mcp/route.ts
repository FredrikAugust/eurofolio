import { withMcpAuth } from "mcp-handler";

import { allowAuthenticationAttempt, clearAuthenticationFailures, verifyOwnerToken } from "@/server/auth";
import { getEnvironment } from "@/server/env";
import { mcpHandler } from "@/server/mcp";

const authenticated = withMcpAuth(
  mcpHandler,
  (request, token) => {
    const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!allowAuthenticationAttempt(key)) return undefined;
    if (!verifyOwnerToken(token, getEnvironment().EUROFOLIO_OWNER_TOKEN)) return undefined;
    clearAuthenticationFailures(key);
    return { token: "[REDACTED]", clientId: "eurofolio-owner", scopes: ["portfolio:read", "portfolio:write"] };
  },
  { required: true },
);

export const GET = authenticated;
export const POST = authenticated;
export const DELETE = authenticated;
