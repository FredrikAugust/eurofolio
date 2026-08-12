# Production dependencies

All versions are exact in `package.json`. Installed sizes below are unpacked pnpm
store package directories on the development machine, so they are comparison
signals rather than browser bundle sizes. Most packages are imported server-side.

| Package | Purpose | Installed package size |
| --- | --- | ---: |
| `drizzle-orm` | Typed SQLite schema and query construction without a generated engine | 16,696 KiB |
| `@libsql/client` | HTTP client for Turso/libSQL; no embedded replica or native SQLite binary | 192 KiB |
| `decimal.js-light` | Exact decimal arithmetic and half-even presentation rounding | 240 KiB |
| `zod` | Shared bounded validation for environment, domain, provider, and MCP inputs | 6,404 KiB |
| `mcp-handler` | Web-standard stateless Streamable HTTP adapter for Next.js | 148 KiB |
| `@modelcontextprotocol/server` | MCP v2 server and tool contracts required by `mcp-handler` | 6,368 KiB |
| `yahoo-finance2` | Replaceable server-only stock/ETF symbol and delayed-price adapter | 6,828 KiB |
| `better-auth` | Database-backed email/password sessions and hardened cookie handling | 3,312 KiB |
| `lightweight-charts` | Responsive financial history chart, dynamically loaded only on a populated dashboard | 3,044 KiB |

No component library, client data cache, state store, queue, native database
engine, or broker SDK is installed. The production build keeps chart code in a
separate lazy chunk; the server-rendered totals and tables do not depend on it.
That chart chunk is 155,855 bytes minified / 51,374 bytes gzip in the measured
Next.js 16.3 Webpack production build.
