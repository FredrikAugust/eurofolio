---
name: Eurofolio
description: An exacting EUR portfolio register drawn as a variable-type quotation specimen.
colors:
  proof-stock: "#fbfaf6"
  surrounding-paper: "#f2f0e9"
  registration-ink: "#0c0c0d"
  signal-orange: "#f04d23"
  custody-cobalt: "#1748ba"
  register-line: "#b9b8b2"
  baseline-soft: "#dbdad4"
  annotation-dim: "#676763"
  error-rust: "#a52e19"
  chart-slate: "#657080"
  chart-label: "#69717b"
  chart-grid: "#e6e9ec"
  chart-crosshair: "#9ca5af"
typography:
  display:
    fontFamily: "Archivo, sans-serif"
    fontSize: "10rem"
    fontWeight: 900
    lineHeight: 0.82
    letterSpacing: "-0.075em"
    fontFeature: "tabular-nums lining-nums"
  headline:
    fontFamily: "Archivo, sans-serif"
    fontSize: "2.35rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.05em"
  title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "2.15rem"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.045em"
  body:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tabular-nums lining-nums"
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Roboto Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.05em"
rounded:
  square: "0"
  status-dot: "50%"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section: "3rem"
components:
  quotation-sheet:
    backgroundColor: "{colors.proof-stock}"
    textColor: "{colors.registration-ink}"
    rounded: "{rounded.square}"
    padding: "0 1.5rem 2rem"
    width: "min(calc(100% - 3rem), 96rem)"
  sign-in-button:
    backgroundColor: "{colors.registration-ink}"
    textColor: "{colors.proof-stock}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.75rem 1rem"
    height: "3rem"
  sign-in-button-hover:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.registration-ink}"
  text-field:
    backgroundColor: "transparent"
    textColor: "{colors.registration-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0.5rem 0"
    height: "2.9rem"
  nav-label:
    backgroundColor: "transparent"
    textColor: "{colors.registration-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    height: "3rem"
---

# Design System: Eurofolio

## Overview

**Creative North Star: "The Quotation Specimen"**

Eurofolio is a variable-type foundry proof crossed with an exchange quotation board. It is exacting, utilitarian, and typographic: portfolio figures are not content placed inside a dashboard system; exact portfolio figures are the visual system. The giant EUR total is the sole spectacle, while every supporting fact submits to exposed baselines, measurement axes, ranks, and aligned registers.

The atmosphere is calm because it is disciplined, not because it is soft. Warm proof stock, registration ink, sparse signal color, crop marks, and hairline rules create the authority of a printed working document. The confirmed anti-reference is the rounded fintech KPI grid and generic AI-dashboard styling: no ornamental cards, floating modules, sidebar shell, donut chart, gradients, or decorative chrome.

**Key Characteristics:**

- One oversized numerical event, surrounded by dense but legible registers.
- Warm paper and black ink with orange and cobalt used only as semantic signals.
- Tabular numerals, tight tracking, explicit ranks, dates, provenance, and measurement marks.
- Flat construction: hierarchy comes from scale, rules, spacing, and alignment.
- Desktop and phone preserve the same reading order while lower-priority percentages and axes yield first.

## Colors

The palette behaves like a two-ink proof on warm stock, with neutral rules doing most of the structural work.

### Primary

- **Signal Orange** (`signal-orange`): marks the valuation date, Endavu custody, ranks, warnings, active navigation, focus, and interactive emphasis. Its scarcity gives it urgency.

### Secondary

- **Custody Cobalt** (`custody-cobalt`): identifies Nordnet custody, manual-source state, chart series, and text selection without competing with the primary signal.

### Neutral

- **Proof Stock** (`proof-stock`): the main sheet and authentication surface.
- **Surrounding Paper** (`surrounding-paper`): the page outside the proof sheet and scrollbar track.
- **Registration Ink** (`registration-ink`): primary copy, values, borders, crop marks, and the Revolut custody line.
- **Register Line** (`register-line`): measurement ticks, column divisions, and dotted row separators.
- **Baseline Soft** (`baseline-soft`): faint historical baselines and quiet grid structure.
- **Annotation Dim** (`annotation-dim`): secondary facts, metadata, inactive controls, and explanatory copy.
- **Error Rust** (`error-rust`): authentication errors only.
- **Chart Slate, Chart Label, Chart Grid, and Chart Crosshair** (`chart-slate`, `chart-label`, `chart-grid`, `chart-crosshair`): subordinate chart-only neutrals that keep history legible without introducing a new brand voice.

### Named Rules

**The Sparse Signal Rule.** Signal Orange and Custody Cobalt identify state, custody, or action; they never become broad decorative fills.

**The Ink-on-Stock Rule.** Primary reading surfaces remain Proof Stock with Registration Ink. Neutral paper variation separates the sheet from its surroundings without simulated elevation.

## Typography

**Display Font:** Archivo variable (with sans-serif fallback)  
**Body Font:** Archivo variable (with sans-serif fallback)  
**Label/Mono Font:** UI monospace (with SFMono-Regular and Roboto Mono fallbacks)

**Character:** Archivo supplies an engineered grotesk voice across a wide weight range, from the 900-weight valuation to restrained register copy. Monospace labels expose the measurement logic and distinguish metadata from financial names and values.

### Hierarchy

- **Display** (900, `display`, 0.82 line-height): the consolidated EUR total only; it scales from 10rem on wide screens to 6rem at the intermediate breakpoint and 2.8rem on phone.
- **Headline** (700, `headline`, 1 line-height): history and holdings section headings.
- **Title** (750, `title`, 1 line-height): prominent account names and major register labels.
- **Body** (400, `body`, 1.5 line-height): explanatory text and ordinary content, always with tabular lining numerals enabled globally.
- **Label** (400, `label`, 0.05em tracking where signposting needs it): uppercase axes, navigation, dates, table headers, facts, and provenance.

### Named Rules

**The Sole Spectacle Rule.** Only the consolidated EUR total may use the extreme display treatment; all other figures step down into aligned register sizes.

**The Numeric Alignment Rule.** Financial values use tabular lining figures and align to the right whenever they share a column.

**The Two-Voice Rule.** Archivo carries names and values; monospace carries coordinates, labels, metadata, and operational status.

## Layout

The primary canvas is a centered proof sheet capped at 96rem, inset 1.5rem from the viewport and framed by a one-pixel Registration Ink rule. A sticky three-column top bar holds brand, centered navigation, and session action. Inside the sheet, sections connect vertically without card gaps: solid hairlines define major boundaries, dotted lines divide register rows, and fixed rank/value gutters make every number comparable.

The opening value field is a three-column instrument: a 3.5rem weight axis, a fluid value lockup, and a 14rem valuation-date gutter. Account and position registers use a 4.5rem rank column, fluid name column, and right-aligned value/percentage columns. The 4-step allocation register and 6-cell fact strip establish repeated horizontal divisions. Major below-fold sections begin after a 3rem interval.

At 1100px, type and fixed gutters contract while the structure remains intact. At 760px, the sheet becomes edge-to-edge, crop marks and the weight axis disappear, the date gutter narrows to 6.5rem, navigation hides, allocation and facts become two-column grids, account percentages and position shares yield, and the holdings table becomes disclosure rows. At 360px, the value and date type contract once more. The page retains a 20rem minimum width and must not scroll horizontally at 390px.

**The Register Continuity Rule.** Sections share edges and rules; do not separate related data into floating containers.

**The Yield Order Rule.** On narrow screens, remove secondary axes and percentages before reducing names or primary values beyond legibility.

## Elevation & Depth

The system is flat. It uses no box shadows, gradients, translucent blur, or lifted surfaces. Depth is conveyed by the contrast between Surrounding Paper and Proof Stock, the framed sheet, sticky top bar, crop marks, line weights, and the hierarchy of typographic scale.

**The Flat Proof Rule.** Surfaces remain on one physical plane; hierarchy is earned by rules, scale, spacing, and alignment, never simulated elevation.

## Shapes

The form language is square, ruled, and mechanically registered. Containers, controls, fields, and navigation have no corner radius. One-pixel solid borders frame sheets and section boundaries; one-pixel dotted rules separate rows. L-shaped crop marks extend beyond the proof-sheet frame, crosses mark valuation coordinates, and right-angle line icons provide directional cues. The only circles are small source-status indicators, where circular shape has explicit state meaning.

**The Square Register Rule.** Do not round structural surfaces or controls. Reserve the 50% radius exclusively for status dots.

## Components

Components are measured and exact. Their identity comes from alignment, typography, and stateful ink changes rather than container decoration.

### Buttons

- **Shape:** square with a one-pixel rule (`square`).
- **Primary:** Registration Ink on Proof Stock text reversal, left-aligned uppercase label, 0.75rem × 1rem padding, and a 3rem minimum height.
- **Hover / Focus:** hover switches to Signal Orange with Registration Ink text over 160ms ease-out; keyboard focus uses a 2px Signal Orange outline offset by 3px.
- **Ghost:** session actions are borderless and transparent, using Annotation Dim at rest and Signal Orange on hover.

### Cards / Containers

- **Corner Style:** square (`square`).
- **Background:** Proof Stock for the primary quotation sheet and login sheet.
- **Shadow Strategy:** none; refer to the Flat Proof Rule.
- **Border:** one-pixel Registration Ink frame with lighter internal register lines.
- **Internal Padding:** 1.5rem horizontal and 2rem bottom on the desktop quotation sheet; 0.85rem horizontal on phone.

### Inputs / Fields

- **Style:** transparent field with no enclosing box, square corners, and a one-pixel Registration Ink baseline.
- **Focus:** the baseline changes to Signal Orange, reinforced by the global visible focus outline.
- **Error / Disabled:** authentication error text uses Error Rust; no decorative error container is introduced.

### Navigation

The top navigation uses 0.75rem uppercase monospace labels inside the 3rem sticky bar. The active page receives a 3px Signal Orange underline; inactive links remain Registration Ink. Navigation collapses below 760px while the brand and sign-out action remain available.

### Value Field

The value field is the signature component: a measurement axis, the 900-weight EUR total, and a stacked orange date/status gutter share one ruled baseline. It has a single 380ms entrance using a firm custom easing curve and respects reduced-motion preferences.

### Account and Position Registers

Ranks, names, values, shares, and provenance occupy stable columns with dotted row separators. Custodian color is applied to whole account rows; position rows remain neutral except for orange ranks and state indicators. Desktop holdings use a dense table, while phone holdings use native disclosure rows with the same content order.

### Fact Strip

Facts and shortcuts occupy equal cells with one-pixel vertical divisions. Labels are uppercase monospace; values use compact Archivo. Linked cells move their value and line-arrow cue to Signal Orange on hover without changing the surface.

## Do's and Don'ts

### Do:

- **Do** make exact values, dates, ranks, completeness, and provenance visible at the point of use.
- **Do** use Proof Stock, Registration Ink, hairlines, crop marks, and aligned baselines to construct hierarchy.
- **Do** keep the giant EUR total as the sole typographic spectacle.
- **Do** preserve tabular lining numerals and right alignment for comparable financial values.
- **Do** preserve the desktop-to-phone reading order and let secondary percentages and axes yield first.
- **Do** keep interactions keyboard-visible and reduce the entrance motion when the user requests reduced motion.

### Don't:

- **Don't** introduce rounded KPI cards, floating panels, a sidebar shell, pills, donut charts, or generic AI-dashboard conventions.
- **Don't** use shadows, gradients, blur, or decorative elevation.
- **Don't** spread Signal Orange or Custody Cobalt across large surfaces; color must retain semantic purpose.
- **Don't** invent trading controls, performance claims, broker branding, or ornamental financial graphics.
- **Don't** hide stale, missing, manual, or partial valuation state behind visual polish.
- **Don't** break register alignment or allow the phone layout to overflow horizontally.
