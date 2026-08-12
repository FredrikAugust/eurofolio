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
