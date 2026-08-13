# Performance baseline

Recorded on 2026-08-12 before application code or production dependencies were added.

## Scaffold

- Next.js 16.3.0 using the Webpack production builder.
- Cold production build: 9.67 seconds.
- Warm production build: 8.12 seconds.
- Peak RSS: 117.00 MB.
- Peak JavaScript heap: 35.96 MB.
- Routes: static `/` and static `/_not-found`.
- Emitted `.next/static/chunks` JavaScript: 904,709 bytes before compression.
- `.next/static`: 1,120 KiB; `.next/server`: 1,060 KiB.

The built-in `next experimental-analyze -o` command was attempted both inside
and outside the workspace sandbox. Turbopack's PostCSS helper could not bind its
internal local port in this environment, so emitted chunk bytes are the stable
bundle comparison used for this baseline.

The memory figures come from Next.js `--experimental-debug-memory-usage`; macOS
`/usr/bin/time -l` could not read `kern.clockrate` inside the sandbox.
# Production navigation optimization — 2026-08-13

- Next.js 16.3 Cache Components and Partial Prefetching are enabled.
- Portfolio reads use tagged `use cache` functions with immediate invalidation after MCP, cron, or backfill mutations.
- Authenticated pages share one persistent route-group layout; the app frame and navigation no longer remount per page.
- Better Auth session validation uses a signed five-minute cookie cache, avoiding a Turso session round trip on every register transition.
- The five bounded owner routes are fully prefetched after app entry and retain per-route Suspense shells.
- Production builds emit Overview, Holdings, History, Activity, Data, and Login as Partial Prerender routes.
- The auth query is explicitly isolated behind `connection()`; this removed a Turbopack `HANGING_PROMISE_REJECTION` found in production logs.
- Post-deploy production error scan: clean.
- Verification: ESLint, TypeScript, 32 tests, webpack production build, Vercel Turbopack production build, signed-in route checks.
