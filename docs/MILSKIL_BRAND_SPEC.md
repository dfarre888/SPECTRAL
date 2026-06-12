# MILSKIL — BRAND SPECIFICATION
**Brand:** Milskil
**Use case:** Military training courseware, slide decks, workbooks, certificates, marketing
**Date:** 24 May 2026
**Reference assets:** 9 master Higgsfield renders in `/brand/`

---

## 1. BRAND DNA

Milskil's visual identity is a **dark, technical, premium military aesthetic** — flight-deck adjacent, contractor-grade, signals expertise without ostentation. It deliberately avoids:
- The "cartoon military" look (camo patterns, AK silhouettes, exploding fonts)
- The "corporate defence prime" look (bland sans-serif, generic stock photography)
- The "Silicon Valley defence-tech bro" look (oversaturated neon, glitch effects, AI hype tropes)

It targets the *Block-Time / professional cockpit / next-generation MOC (Mission Operations Centre)* feel — a system that a real military operator would find credible.

---

## 2. COLOUR SYSTEM

### 2.1 Foundation (always present)

| Token | Hex | RGB | Use |
|---|---|---|---|
| `--milskil-bg` | `#080808` | 8 8 8 | Primary background (slides, workbook pages, exports) |
| `--milskil-surface-1` | `#0F0F0F` | 15 15 15 | Card / panel surface, second-tier glass |
| `--milskil-surface-2` | `#1A1A1A` | 26 26 26 | Third-tier glass, hover state |
| `--milskil-text-primary` | `#F5F5F5` | 245 245 245 | Body text, headlines |
| `--milskil-text-secondary` | `#9CA3AF` | 156 163 175 | Labels, metadata, captions |
| `--milskil-text-tertiary` | `#6B7280` | 107 114 128 | Disabled, dim, footnote |
| `--milskil-divider` | `#262626` | 38 38 38 | Hairlines, dividers, grid |

### 2.2 Warm mode — Orange (kinetic / strike / chapter dividers / brand)

| Token | Hex | Use |
|---|---|---|
| `--milskil-orange` | `#F97316` | Primary brand orange — logos, callouts, key emphasis |
| `--milskil-orange-glow` | `#FB923C` | Backlit neon, glow halo |
| `--milskil-orange-dim` | `#9A3412` | Subdued / aged variant |

**Use Warm mode for:**
- Cover slides, chapter dividers (Day 1, Day 2, Day 3)
- Loitering munitions, kinetic strike content
- Adversary / Red Force slides
- Critical warnings, "BOLO" call-outs
- Final summary / call-to-action slides

### 2.3 Cool mode — Cyan/Blue (technical / ISR / data / friendly)

| Token | Hex | Use |
|---|---|---|
| `--milskil-cyan` | `#06B6D4` | ISR data, coordinates, sensor feeds |
| `--milskil-blue` | `#3B82F6` | HUD overlays, wireframe |
| `--milskil-blue-glow` | `#60A5FA` | Backlit, holographic mode |
| `--milskil-blue-deep` | `#1E3A8A` | Deep technical backgrounds |

**Use Cool mode for:**
- Sensor / payload / radar content
- Datalink / C2 / Order of Battle slides
- ISR module
- Blue Force in scenarios
- Charts and graphs (default colour palette)

### 2.4 Semantic data colours (in addition to mode colours)

| Token | Hex | Use |
|---|---|---|
| `--milskil-green` | `#10B981` | Valid, operational, friendly |
| `--milskil-amber` | `#F59E0B` | Caution, warning, marginal |
| `--milskil-red` | `#DC2626` | Critical, hostile, denied |
| `--milskil-purple` | `#A78BFA` | Night ops, EW, special category |

---

## 3. TYPOGRAPHY

### 3.1 Type stack

| Role | Font | Fallback | Weight | Use |
|---|---|---|---|---|
| **Display** (hero, titles) | *Eurostile Extended* / *Bank Gothic* | Industry, Inter | 700 | Slide titles, chapter dividers, name plates |
| **Body** | *Inter* | Helvetica Neue, Arial | 400 / 500 | All standard text |
| **Numeric / data** | *JetBrains Mono* | Roboto Mono, Consolas | 500 | All numbers, coordinates, dimensions, ranges, weights, percentages — strict rule |
| **Caption** | *Inter* | Helvetica Neue | 400 italic | Photo credits, source citations |

If Eurostile/Bank Gothic licensing isn't viable for client distribution, substitute **Industry** (Adobe Fonts) or **Inter Display** (open-source). Document the substitution in the master template.

### 3.2 Type rules

- **All numeric values use mono.** Always. Heights, weights, ranges, percentages, dates, coordinates, monetary values. This is the single most distinctive Milskil typography rule.
- **Headlines in display font, all caps tracking +50.** "PLATFORM LANDSCAPE" not "Platform Landscape."
- **Body always sentence case.** Don't shout in paragraphs.
- **Avoid italics in body text.** Italics only for captions, foreign-language terms, and ship/aircraft names.
- **Line length max 75 characters** in workbooks; max 55 in slides.

---

## 4. LAYOUT GRID

### 4.1 Slide grid (16:9, 1920×1080)

- 12-column grid, 80px margin, 24px gutter
- Title row top 120px
- Footer row bottom 60px (page number, course code, classification marking)
- Safe content zone: 1760×880

### 4.2 Workbook grid (A4 portrait, 210×297mm)

- 12-column grid, 20mm outer margins, 5mm gutters
- Header band 25mm with Milskil mark + chapter
- Footer band 15mm with page number, lesson code

---

## 5. SLIDE LAYOUTS (master template)

Build these layouts in the .pptx master:

| # | Layout | Use |
|---|---|---|
| 01 | **Cover** — full-bleed brand image, large display title, course code, version, classification banner | Course front cover, day section opens |
| 02 | **Chapter divider** — solid colour mode (warm or cool), large chapter number + title, faint radar/HUD background | Between major lesson blocks |
| 03 | **Title + content** — title bar, body text with one image or chart | Default content slide |
| 04 | **Two-column** — left column text, right column image/diagram | Most platform/capability content |
| 05 | **Three-up grid** | Comparisons (3 platforms side by side) |
| 06 | **Table** — full data table with mono numerics, alternating row tint | Capability matrices, spec sheets |
| 07 | **Full-bleed image** — image fills slide, title overlay bottom-left | Hero / atmospheric / scenario opener |
| 08 | **Chart** — large chart with annotation panel | Graphs, scatter plots, range/altitude charts |
| 09 | **Quote / pull-stat** — single huge number or quote, centred, mono | Key facts (e.g. "70% of IAF FLIGHT HOURS WERE UAV") |
| 10 | **Summary** — three to five bullet recap with icons | End of lesson |
| 11 | **Instructor-note variant** — same as content slide but with red side-bar marked "INSTRUCTOR NOTES" containing talking points (only in instructor PDF) | Optional, generated as a separate instructor-only PDF |
| 12 | **Exercise / syndicate** — orange-mode, clear "EXERCISE" header, scenario text, deliverable, time allocation | Tabletop and syndicate exercises |
| 13 | **Knowledge check** — question + multiple choice + answer flag (hidden in student version, shown in instructor) | End of each lesson |
| 14 | **Classification banner** — required on every slide top + bottom: "UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY" or "UNCLASSIFIED" depending on cohort | Built into the master template |

---

## 6. IMAGERY DIRECTION

### 6.1 Hero / divider imagery

Use the existing Milskil brand assets in `/brand/`:

| File | Mode | Best use |
|---|---|---|
| `milskil_warm_orange_neon_clean.png` | Warm | Course cover, brand reset |
| `milskil_warm_orange_neon_hero.png` | Warm | Day chapter dividers |
| `milskil_warm_orange_radar_circular.png` | Warm | Strike / kinetic chapter divider |
| `milskil_cool_blue_wireframe_clean.png` | Cool | ISR / sensor chapter divider |
| `milskil_cool_blue_radar_hud_text.png` | Cool | C2 / data chapter divider |
| `milskil_cool_blue_dashboards.png` | Cool | Datalink lesson opener |
| `milskil_cool_blue_tactical_dashboard.png` | Cool | Counter-UAS / sensor fusion |
| `milskil_cool_wireframe_hud_01.png` | Cool | Procurement decision lesson |
| `milskil_crest_shield_fighter.png` | Crest | Course cover badge, certificate, instructor lanyard |

### 6.2 Slide-specific imagery (Higgsfield-generated per slide pack)

For platform, sensor, weapon, scenario slides — Claude will generate prompts per slide pack and David will run them through Higgsfield. Prompts must follow this style baseline:

```
STYLE: cinematic documentary military photography, desaturated palette,
anamorphic lens, golden hour or overcast lighting, professional defense
imagery aesthetic, photorealistic, 35mm.
MOOD: tense, professional, operational.
NEGATIVE: cartoon, low quality, watermark, civilian aesthetic, anime,
3D render, video game style, oversaturated, AI artifacts.
ASPECT: 16:9 (slides) / 21:9 (chapter dividers) / 1:1 (workbook insets).
```

**Per-image, override only one variable per request** (subject, mood, time-of-day). Keep all else baseline so Higgsfield output is consistent across the deck.

### 6.3 Graphs and charts — Higgsfield vs native

| Chart type | Use Higgsfield? | Why |
|---|---|---|
| Quantitative data (bar, scatter, line, multi-series) | **NO** — native chart_display_v0 or Excel chart export | Accuracy is the whole point; Higgsfield can't be trusted with numeric labels |
| Order of battle / orbat diagrams | **Mixed** — base render in Higgsfield (atmospheric hero), labelled overlay in native | Hero image for impact, labels in PowerPoint for control |
| Schematic / process flow | **NO** — native (Mermaid, draw.io, or PowerPoint shapes) | Same reason as charts |
| Map overlays | **NO** — proper mapping tool (places_map_display_v0 or QGIS export) | Geographic accuracy required |
| Conceptual "hero" diagrams (e.g. kill chain visualisation, layered defence concept) | **YES** — Higgsfield for atmosphere, native overlay for labels | Best of both |
| HUD / cockpit-style decorative dashboards | **YES** — Higgsfield is excellent at this | David's existing assets prove it |

---

## 7. ICONOGRAPHY

Use a single icon family across all production:
- **Lucide** (open-source) at 1.5px stroke, default colour token, no fill
- Icons sized 24px in body, 48px in section headers, 96px in chapter dividers
- Never mix icon families
- Custom military-specific icons (aircraft silhouettes, ship outlines, UAV types) drawn as flat 2D SVGs in Milskil-orange or Milskil-cyan only

---

## 8. DATA VISUALISATION

### 8.1 Default chart palette (Cool mode)

```
Primary:    #06B6D4   (cyan)
Secondary:  #3B82F6   (blue)
Tertiary:   #A78BFA   (purple)
Quaternary: #10B981   (green)
Quinary:    #F59E0B   (amber)
Background: #0F0F0F   (surface-1)
Grid:       #262626   (divider)
Text:       #F5F5F5   (text-primary)
```

### 8.2 Adversary chart palette (Warm mode — for Red Force / threat content)

```
Primary:    #F97316   (orange)
Secondary:  #DC2626   (red)
Tertiary:   #FB923C   (orange-glow)
Background: #0F0F0F
```

### 8.3 Chart rules

- Always label axes with units. "ENDURANCE (HRS)" not "Endurance"
- Numeric labels in mono. Always.
- Maximum 5 data series per chart. Beyond that, split into multiples.
- No 3D charts. Ever.
- No pie charts unless quantity is 2–3 categories. Use horizontal bar instead.
- Grid lines `#262626` at 20% opacity. No heavy gridding.
- Annotations in orange callout boxes — use these to draw the eye to the *finding*, not just the data.

---

## 9. WORKBOOK FORMAT

- **A4 portrait**
- Two-column layout where dense, single-column where reflective
- Lesson code in header (e.g. `MIL-DRN-101-L03` = Course, Module, Lesson)
- Page number bottom outer corner (book-spread style)
- Knowledge check questions at end of each lesson with blank lines for student notes
- Glossary cross-references in margin in cyan small caps (e.g. `↗ SEE: MALE`)
- Sources / further reading on lesson-end page in tertiary text colour

---

## 10. CERTIFICATE TEMPLATE

- A4 landscape
- Black background, orange Milskil crest centre-top
- Student name in display font, large, centre, white
- Course title beneath in display all caps
- Completion date in mono, lower left
- Course code + version, lower right
- Embossed-effect Milskil crest mark watermark behind text at 8% opacity
- Signature line for Chief Instructor / Course Director

---

## 11. FILE NAMING CONVENTION

All production files follow:

```
MIL-DRN-{TYPE}-{IDENTIFIER}-v{VERSION}.{ext}
```

Examples:
- `MIL-DRN-SLIDES-D1P1-v1.0.pdf` (Day 1, Pack 1)
- `MIL-DRN-WORKBOOK-D2-v1.0.pdf`
- `MIL-DRN-MATRIX-PLATFORMS-v1.0.xlsx`
- `MIL-DRN-SCENARIO-VIG-03-v1.0.pdf`
- `MIL-DRN-INSTRUCTOR-D1P3-v1.0.pdf`

---

## 12. CLASSIFICATION MARKING (mandatory on every slide and page)

Default for unclassified courseware:

```
UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
```

If used for a cohort where the customer has approved a partner-restricted handling marking, switch to:

```
UNCLASSIFIED // FIVE EYES / [PARTNER] ONLY
```

Banner top-edge and bottom-edge of every slide, in 12pt sans-serif white at 70% opacity. Banner on every workbook header and footer, 9pt.

---

## 13. ACCESSIBILITY

- Minimum contrast ratio 4.5:1 for body text
- Minimum 7:1 for caption / footnote text on dark surface
- All chart colours distinguishable in greyscale (test with one print of every chart before sign-off)
- Body text minimum 12pt (slides) / 10pt (workbooks)
- No information conveyed by colour alone — pair colour with shape or label

---

**END BRAND SPEC**
