---
version: 1
slug: "src-app-data-page-tsx"
primary_target: "src/app/data/page.tsx"
related_targets: ["src/app/app-frame.tsx","src/app/globals.css"]
---

# Eurofolio data surface

- Scope: authenticated `/data` on desktop and phone.
- Mode: Operate.
- Job: audit instrument provenance, latest prices, FX observations, and refresh outcomes.
- Direction: a provenance proof sheet; partial refresh state uses signal orange and never hides failed counts.
- Constraint: read-only; refresh and manual corrections remain MCP-only.
