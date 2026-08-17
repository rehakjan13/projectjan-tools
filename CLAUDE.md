# Project Jan — repo notes for Claude Code

Static site, no build step, deployed to Netlify. Vanilla HTML/CSS/JS only. Each tool lives in its own top-level folder and is self-contained (own inline `<style>`, own assets).

## Design tokens

Established by `mixing-ratio-calculator/`, reused by every new tool unless a tool has a strong reason to diverge (the homepage `index.html` uses a different dark theme — that's a one-off, not the shared system).

```css
--p:  #6D28D9;  --pl: #EDE9FE;  --pt: #26215C;   /* primary (purple) */
--o:  #C2410C;  --ol: #FFF7ED;  --ot: #7C2D12;   /* accent (orange) */
--g:  #15803D;  --gl: #DCFCE7;  --gt: #14532D;   /* success (green) */
--grad: linear-gradient(135deg, #6D28D9 0%, #9333EA 50%, #C2410C 100%);
--border: #E5E7EB; --bg: #F9FAFB; --card: #fff; --text: #111827; --muted: #6B7280; --hint: #9CA3AF;
```

Fonts: **Plus Jakarta Sans** (400/500/600) for body/UI text, **JetBrains Mono** (400/500) for labels/mono accents. Loaded via Google Fonts `<link>`, same as `mixing-ratio-calculator/index.html`.

Mobile-first. Numeric inputs use `inputmode="decimal"`.

## URL structure — color/ module

```
/color/                          → landing (links to calculator + training)
/color/delta-e/                  → Delta E calculator (master panel, samples, history)
/color/training/                 → intro to colorimetry, single page with anchored sections
/color/training/quiz/basic/      → basic quiz (10 Qs, single/multiple/numeric, 70% to pass)
```

Files:
```
color/
  assets/
    colorspace.js   ← pure functions: Lab<->LCh, Lab->sRGB preview. No DOM.
    deltae.js        ← pure functions: CIE76, CIE94, CMC l:c, CIEDE2000. No DOM.
    interpret.js     ← pure functions: Lab deltas -> plain-language sentences. No DOM.
    plot.js          ← hand-rolled SVG for a*b* plane + L* band, incl. tolerance ellipse geometry. No DOM state, takes an element to fill.
    store.js         ← localStorage: master library, per-master history, training/quiz progress.
    i18n.js          ← t(key) dictionary. `en` filled, `cs` stubbed (empty) — training is EN-only for now per explicit decision.
    ui.css           ← shared design tokens + full component library (cards, tabs, badges, tables, quiz, plots)
    ciede2000-sharma-testdata.txt  ← reference dataset (Etapa 1 verification)
  deltae.test.html   ← static test runner, open directly in a browser, no server needed
  delta-e/index.html ← calculator UI
  index.html         ← landing page
  training/index.html      ← intro (7 sections in one page, interactive L*a*b* slider + swatch)
  training/quiz/basic/index.html  ← quiz mechanic
  training/data/quiz-basic.json   ← 18-question bank, source of truth — quiz page embeds a copy
                                     inline (fetch() of a local file is blocked outside http/https,
                                     so keep both in sync when editing questions; once deployed to
                                     Netlify this could switch to fetch()).
```

Scope note (2026-08-17): original spec (`delta-e-spec.md`, not committed to repo) had 7 basic + 5 advanced training modules across separate URLs, and two quiz levels. Day-1 scope, per explicit user decision, was simplified to one combined intro page (same 7 topics, as anchored sections not separate URLs) and one quiz level (18-question bank, not the spec's 30+). Advanced tier, per-module URLs/SEO split, and quiz-advanced are backlog — same shape as the original spec's Etapa 3 (finish split)/4.

Other scope cuts made today (not bugs, deliberate — revisit before calling this "done"):
- Gloss triad (20/60/85 GU) was **not** implemented — used single value + tolerance instead, based on the historical Excel data (`20201104 Color file new JRLM.xlsx`) which only ever recorded gloss as one number + tolerance.
- CIE94 preset toggle (graphic arts vs. textiles) is not exposed in the UI — always uses graphic arts defaults (kL=1, K1=0.045, K2=0.015). CMC l:c toggle (2:1/1:1) *is* exposed.
- Component-level tolerances (separate ΔL/ΔC/ΔH limits) not implemented — one overall tolerance value only.
- Batch CSV export not implemented — paste-multiple-rows produces an on-page results table only (click a row to load it into the main panel), no file export yet.
- Image/OCR input tab not implemented (that's Etapa 6 in the original spec, needs a Netlify Function + API key).
- Certificate generation not implemented — explicitly deprioritized by the user ("není to důležité").
- a*b* plane background colour-tint (real-colour raster fill) not implemented — plot shows grid/axes/ellipse/arrows only.
- **i18n gap:** most static labels in `delta-e/index.html` (headings, field labels, table headers) are hardcoded English in the markup, not routed through `t()` — only dynamically-generated strings (results, interpretation, badges) use the dictionary. This contradicts the i18n convention stated above. Not urgent while EN is the only shipped language, but do a full pass before ever turning on `cs` — retrofitting later is exactly the "peklo" the original spec warned about.
- Noise-floor/deviation is now two fields (`ΔL* ±`, `Δa*/Δb* ±`, both default 0.3) instead of one, per user's real instrument-repeatability practice (2026-08-17). `interpret.js`'s gate checks raw Δa*/Δb* individually (what the instrument actually reports), not the derived ΔC*/ΔH* — a component can't exceed the vector it's rotated from, so gating on the Cartesian values is the stricter and more meaningful check; the description language itself still stays in LCh terms per spec rule 4.3.2.

## i18n convention

All UI strings go through `t('key')` from the start, even though v1 ships EN-only. Dictionary shape: `{ cs: {...}, en: {...} }`. Do not hardcode strings outside the dictionary — retrofitting i18n into finished markup is expensive, per explicit project rule.

## Math conventions (deltae.js / colorspace.js)

- All trig in **degrees** — use the `sind`/`cosd`/`atan2d` helpers, never raw `Math.sin`/`Math.cos` on a degree value.
- Reference/master = argument 1, sample = argument 2, consistently.
- ΔH magnitude is clamped to ≥0 under the sqrt, sign taken from the hue-shift direction (`h2 - h1`, normalized to ±180°).
- Gloss stored as a single value + tolerance (e.g. `1.3 ±0.2`), not the GU 20/60/85 triad — confirmed against real historical measurement records, simpler than the spec's original proposal.

## Module status

| Module | Status |
|---|---|
| `colorspace.js` (Lab↔LCh, Lab→sRGB) | ✅ done |
| `deltae.js` (CIE76, CIE94, CMC l:c, CIEDE2000) | ✅ done — verified against Sharma/Wu/Dalal (2005) 34-pair reference set, max deviation 4.95e-5 (tolerance 1e-4) |
| `deltae.test.html` | ✅ done |
| `interpret.js` | ✅ done |
| `plot.js` (a*b* plane, L* band, tolerance ellipse) | ✅ done — no colour-tint background yet |
| `store.js` (master library, history, progress) | ✅ done |
| `i18n.js` | ✅ done, EN only — `cs` stubbed empty |
| Delta E calculator UI (`/color/delta-e/`) | ✅ done — Manual + Paste input, all 4 formulas, tolerance pass/fail, master library w/ metadata + geometry/illuminant mismatch warning, per-master history, export/import JSON, shareable URL state, prefilled with a real historical batch record |
| Landing page (`/color/`) | ✅ done |
| Training / intro section | ✅ done — 7 topics as anchored sections on one page (not yet split into separate URLs/SEO pages per original spec) |
| Quiz (basic) | ✅ done — 18-question bank (spec wanted 30+), 10 drawn + shuffled per attempt incl. 2 procedurally generated numeric questions, topic breakdown, retake |
| Certificate generation | ⬜ not started — deprioritized by user |
| Glossary + search (`/color/glossary/`, landing quick-search) | ✅ done — `assets/glossary.js`, FAQPage schema injected client-side |
| Colour vision self-check (`/color/vision-test/`) | ✅ done — informal D-15-style hue arrangement, Total Error Score + zone radar chart, explicit non-clinical disclaimer |
| Homepage link (`/index.html`) | ✅ done — "Colorimetry" card added under Tools for Painting |
| Advanced training + quiz | ⬜ backlog |
| Per-module SEO split (separate URL per training topic) | ⬜ backlog |
| Multiangle, metamerism (multi-illuminant), OCR (v2) | ⬜ backlog |
| Gloss triad (20/60/85), CIE94 preset toggle, component tolerances, batch CSV export | ⬜ backlog — see scope-cut notes above |

Note on the glossary's FAQPage schema: it's injected via JS at load (`document.head.appendChild`), not baked into static HTML, because it's generated from the same `glossary.js` data the search UI uses (single source of truth). Google's crawler executes JS and picks this up, but it's less universally robust than static JSON-LD — revisit if FAQ rich results don't show up after indexing.

**Not yet verified in a real browser** — this environment's preview sandbox can't load local relative CSS/JS (only static HTML snapshots render), and no JS runtime (node/deno/bun) is installed here. Verification done instead: (1) all inline/external JS passed `esprima` syntax parsing, (2) `colorspace.js`/`deltae.js`/`interpret.js`/`plot.js` were actually executed via a Python JS interpreter (`js2py`) with real Lab inputs and produced sane numeric + SVG output, (3) manual read-through of the DOM-wiring code in each page. **Open each page directly from disk in a real browser before treating this as final** — no server needed, just double-click / open via `file://`.

Update this table after every completed stage.
