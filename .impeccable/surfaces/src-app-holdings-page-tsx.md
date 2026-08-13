---
version: 1
slug: "src-app-holdings-page-tsx"
primary_target: "src/app/holdings/page.tsx"
related_targets: ["src/app/app-frame.tsx","src/app/sparkline.tsx","src/app/globals.css"]
---

# Eurofolio holdings surface

- Scope: authenticated `/holdings` on desktop and phone.
- Mode: Operate.
- Job: compare every position, current EUR value, share, custody, source, and recent native-price direction.
- Direction: Quotation Specimen extended as a long exchange register; no cards or floating chart widgets.
- Phone: exact value and name stay on the first line; the trace occupies a second ruled line; details disclose quantity, price, date, and source.
- Sparkline rule: server SVG from stored observations only; fewer than two observations renders an explicit count rather than a fabricated line.
