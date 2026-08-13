# Eurofolio

A private, single-owner portfolio ledger with EUR reporting, exact decimal
arithmetic, delayed stock/ETF prices, ECB currency rates, and an MCP-only data
entry surface.

Production: <https://eurofolio.vercel.app>

## Architecture

- Next.js 16.3 Server Components on Vercel
- Turso/libSQL through Drizzle ORM
- Better Auth email/password sessions with public signup disabled
- Lightweight Charts loaded only for portfolio history
- Yahoo Finance delayed stock/ETF prices and ECB daily FX rates
- Stateless Streamable HTTP MCP at `/mcp`

## Local commands

Use pnpm exclusively:

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm verify
pnpm db:migrate
pnpm auth:bootstrap
pnpm openspec validate build-single-user-portfolio-mvp --strict
```

Standalone database and bootstrap scripts require the variables from
`.env.example`; Next.js itself loads `.env.local` automatically.

## MCP configuration

The endpoint is `https://eurofolio.vercel.app/mcp` and requires a bearer token.
The token is stored in macOS Keychain under service
`eurofolio-mcp-owner-token`, account `fmalmo`:

```bash
security find-generic-password \
  -a fmalmo \
  -s eurofolio-mcp-owner-token \
  -w
```

Configure an MCP client with the endpoint above and an `Authorization` header
whose value is `Bearer <token>`. Do not commit or paste the token into tracked
configuration.

## Operational notes

- Dashboard signup is disabled permanently after bootstrap.
- Database migrations are versioned in `drizzle/` and must run once before a
  release that changes schema.
- Rotate the MCP token in macOS Keychain and both Vercel Preview/Production
  environment variables together.
- Market data is delayed and best-effort. Manual price and FX overrides are
  available through MCP and take precedence for the same date.
- No broker connections or general REST mutation API exist.
