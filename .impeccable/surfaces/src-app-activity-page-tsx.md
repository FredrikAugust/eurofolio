---
version: 1
slug: "src-app-activity-page-tsx"
primary_target: "src/app/activity/page.tsx"
related_targets: ["src/app/app-frame.tsx","src/app/globals.css"]
---

# Eurofolio activity surface

- Scope: authenticated `/activity` on desktop and phone.
- Mode: Operate.
- Job: scan the ledger newest-first and filter by account or event type without introducing web mutations.
- Direction: a server-filtered cashbook register with exact dates, event vocabulary, instruments, values, and notes.
- Phone: native disclosure rows preserve full event detail and browser back/deep-link behavior.
