# HANDOFF BRIEF — Milskil Military Drone Course Build
**Project:** *Milskil Military Drone Operations Course* — 3-day taught + 2-day field/sim Red v Blue scenario
**Client / Owner:** David, founder of A3DM (Advanced Aviation Aerodrome And Drone Management)
**Brand:** **Milskil**
**Date prepared:** 24 May 2026
**Prepared by:** Claude (mobile/web instance, original research session)
**Audience for this brief:** The next Claude instance picking this up in Cowork

---

## 1. WHAT THIS PROJECT IS

David is building a contractor-grade military drone operations course aimed at:
- Five Eyes (US, UK, AUS, CA, NZ)
- Singapore, Indonesia, UAE, Japan
- Selected friendly European partners

**Delivery format:**
- **Days 1–3:** Taught course — lectures, workbooks, tabletops, syndicate exercises (this is the primary deliverable, sells as a stand-alone product)
- **Days 4–5:** Optional bolt-on Red v Blue scenario week — desktop serials escalating to field/sim exercises (sold separately)

**Audience pitch level:** Military-literate (acronyms defined on first instance then used freely). Mixed audience tolerated — defence contractors and civilian project managers welcome, glossary annex provided.

**Threat environment primary backbone:** **Mixed European/global** (Ukraine lessons, FPV/loitering munition saturation, EW-heavy) — most universally applicable. Indo-Pacific peer/near-peer and Middle East hybrid available as alternate vignettes in the scenario library.

**Approach to small/FPV and multi-domain:** GO DEEP on FPV/small-tier (David's directive). Cover surface/ground/subsurface uncrewed systems at orbat-integration level but the flying systems are the main focus.

---

## 2. WHAT'S ALREADY DONE

### Phase 1 — Platform Landscape: ✅ COMPLETE
File: `phase1/01_platform_landscape.md`

Comprehensive coverage of military UAS platforms across all DoD Groups 1–5 plus NATO classes, organised by region:
- US (MQ-9B, RQ-4, MQ-4C, CCA — YFQ-42 Dark Merlin and YFQ-44 Fury, Group 1–2 small, Replicator → DAWG)
- UK (StormShroud, Tekever AR3/AR5, Watchkeeper, Project Aether)
- Australia (MQ-28A Ghost Bat with Dec 2025 live AMRAAM kill, MC-55A Peregrine)
- Israel (Heron TP/Eitan, Hermes 900/Kohav, Harop — 70% IAF flight hours UAV during Rising Lion)
- Türkiye (TB2, TB3, Akinci, Kizilelma into service 2026, $2.2B Baykar exports)
- China (GJ-11 Sharp Sword Tibet deployment, CH-7, Wing Loong II, WZ-7)
- Russia/Iran (Shahed-136/Geran-2 — 57,000+ launched, Shahed-238/Geran-3 turbojet, Lancet, fibre-optic)
- Ukraine (4M drones in 2024, 200K/month FPV, Magura V5 paradigm shifts, Sea Baby)
- Europe (Eurodrone, Aarok, FCAS Remote Carriers)
- Indo-Pacific (Indonesia 60× TB3 + 9× Akinci + Kizilelma + Anka-S; Singapore Hermes 900 + reservist drone training; Japan FY26 wide-area UAV; UAE EDGE QX family + Halcon swarming; India, Taiwan, Korea)

Includes summary tables, top 8 combat-proven trendsetters case studies, draft workbook questions, Day 1 slide pack plan, draft Higgsfield image prompts.

### Phase 2 — Payloads, Sensors, Weapons, Datalinks: ✅ COMPLETE
File: `phase2/02_payloads_sensors_weapons.md`

Full coverage of:
- Sensor taxonomy (EO/IR, Radar, SIGINT/EW, Specialised)
- EO/IR gimbal hierarchy (WESCAM MX-10/15/20/25, Raytheon MTS-A/B/C, ASELFLIR-500, Israeli Controp/IAI/Elbit, Chinese AVIC/CETC, small-class STAG-5)
- SAR (Lynx Ku-band, EL/M-2055, SeaSpray, AESA — MURAD)
- Maritime search radar (Lynx Maritime, SeaSpray 7500E, OceanMaster)
- GMTI
- SIGINT (COMINT/ELINT/FISINT, AOA/TDOA/FDOA/POA geolocation, Kalaetron Integral, BAE Tactical SIGINT, KZ-900, BriteStorm)
- Weapons (MAM-C/L/T, TEBER-82, TOLUN, GBU-39 SDB, AGM-114 Hellfire including R9X "Ninja", AGM-179 JAGM, Brimstone, Spike NLOS, AIM-120 AMRAAM, SOM-A, EREN, LS-6, FT-8C)
- Datalinks (Link-16, CDL, TCDL, MAVLink, mesh, STANAG 4609/7085/4671)
- GPS-denied navigation (visual SLAM, INS, fibre-optic, terrain-referenced, celestial)
- Payload-platform compatibility matrix
- Procurement decision tree for foreign militaries

### What is NOT yet done
- **Phase 3:** Loitering Munitions & One-Way Attack deep dive
- **Phase 4:** Counter-UAS (C-UAS) taxonomy and systems
- **Phase 5:** Emerging Technology Horizon Scan
- **Phase 6:** Doctrine & TTPs by nation (and integration with platforms in Phase 1)
- **Phase 7:** PRODUCTION — slides, workbooks, Excel matrices, scenario library, instructor notes

---

## 3. WHAT TO PRODUCE IN COWORK

### 3.1 Final deliverable bundle (the entire course package)

| Deliverable | Format | Volume | Notes |
|---|---|---|---|
| Master research dossier | Markdown (combined Phases 1–6) | ~80–120 pp | Single source of truth |
| **Slide decks** — modular per lesson | **PDF** (David's preference) | **~350 slides across 18 packs** | Built from .pptx then exported. Milskil dark template. |
| **Workbooks** — 1 per day + scenario | **PDF** | ~40 pp each, 3+1 = 4 books | Includes learning objectives, exercises, knowledge checks |
| Excel reference matrices | .xlsx | 5–7 sheets | Platform matrix, payload compatibility, c-UAS vs threat, threat-band ranges, lesson timetable |
| Higgsfield image prompt library | Markdown + per-slide notes | ~80–120 prompts | Batched per slide pack |
| Scenario library (Red v Blue) | PDF | 4–6 vignettes | Permissive → contested → peer-denied. Desktop tabletop → sim/field. |
| Instructor notes | PDF | 1 master + per-lesson | Talking points, common student errors, classified/unclassified divergence flags |
| Glossary annex | PDF | ~20 pp | All acronyms defined, master running list |
| Milskil certificate template | PDF | 1 page | Course completion, uses crest mark |

### 3.2 Production order

1. **Finish research first.** Phases 3, 4, 5, 6 in that order. Commit each as its own markdown file before moving on. This protects work and lets David review and redirect.
2. **Build the course architecture document.** Final 3-day timetable, lesson list, learning objectives, slide count per pack, scenario flow. David approves.
3. **Build the Milskil PowerPoint master template.** One .pptx with all slide layouts (title, section divider, content, two-column, table, full-bleed image, chart, quote, summary, instructor-note variant). Apply to all packs.
4. **Slide production by day** — Day 1 packs first (5 packs), David reviews, then Day 2, then Day 3, then scenario briefing.
5. **Workbooks in parallel** with the slide packs of the same day.
6. **Excel matrices** — extracted from research dossier, build once data is locked.
7. **Higgsfield prompt batches** — one batch per slide pack, delivered as soon as that pack's slide list is final. David generates images, drops them back into Cowork project folder, Claude places them.
8. **Scenario library + instructor notes** — last, once content is settled.

---

## 4. BRAND & DESIGN SYSTEM

See `brand/MILSKIL_BRAND_SPEC.md` for the complete spec.

Bullet summary:
- Black/charcoal base (#080808–#0F0F0F)
- **Two accent modes:** Warm orange (#F97316) for kinetic/strike/chapter dividers; Cool cyan-blue (#3B82F6 / #06B6D4) for technical/ISR/data slides
- 3D metallic typography for hero/cover/divider slides
- Radar sweep + HUD overlay motif throughout
- Crest/shield mark for institutional applications (cover slides, certificates, instructor lanyards)
- All numeric data in monospace font
- Sample brand reference images are in `brand/` directory

David already has 9 Higgsfield-generated brand assets in `brand/`. Reuse them — re-generation requested only for slide-specific imagery, not the brand identity itself.

---

## 5. KEY DECISIONS DAVID HAS ALREADY MADE

These are LOCKED. Don't re-ask:

1. **Scope:** Full tier coverage (Groups 1–5), all roles, multi-domain (air primary)
2. **Geography:** Five Eyes + SG + ID + UAE + JP + selected friendly EU
3. **Depth:** Go deep on FPV/small-tier and Ukraine lessons. Cover legacy MALE/HALE thoroughly but the centre of gravity is the new paradigm.
4. **Threat backbone:** Mixed European/global as primary, with Indo-Pacific peer and Middle East hybrid as alternate vignettes
5. **Audience pitch:** Military-literate, acronyms defined on first use, glossary annex
6. **Length:** 3 days taught + 2 days scenarios (5 days total, modular)
7. **Slides:** ~350 across the package, modular by lesson
8. **Format:** PDF for end-state deliverables (built from .pptx)
9. **Brand:** Milskil dark identity, 9 reference assets already approved
10. **Image generation:** David uses Higgsfield, prompts delivered in batches per slide pack
11. **Scenarios:** Classroom desktop serials escalating to "blind" Red v Blue then to field/sim

---

## 6. KEY OPEN ITEMS (DAVID TO CONFIRM IN COWORK)

These were flagged in the original session but not yet locked:

| # | Question | Default if no answer |
|---|---|---|
| Q1 | Sim platform for the field portion (VBS4? Steel Beasts? Bohemia VBS Blue/Red? Custom?) | Default to platform-agnostic scenario design — runs on any modern military sim or paper |
| Q2 | Classified-adjacent material — does David want flagged callouts for "this is where the public picture diverges from likely reality"? | Default: include flags but mark them clearly so they can be removed for unclassified-only delivery |
| Q3 | Pricing/commercial structure — is the course sold per-seat, per-cohort, or as licensed-to-other-trainers? | Not a content question, but affects whether instructor notes need a "train-the-trainer" annex |
| Q4 | Course branding co-presence — is this delivered solo as Milskil, or co-branded with A3DM or a defence prime partner? | Default: Milskil solo brand, A3DM logo on a single "About the Course Author" slide |
| Q5 | Language — English only, or does David need translation hooks built in for foreign customers? | Default: English only, but design avoids text-on-image so translation is layout-trivial |

---

## 7. SUGGESTED COWORK PROMPT TO RESUME

When David starts in Cowork, suggest he opens with:

> *"I'm continuing the Milskil Military Drone Course build. Read HANDOFF_BRIEF.md, BRAND_SPEC, and the two completed phase files. Then commence Phase 3 (Loitering Munitions & OWA deep dive). Commit Phase 3 as a markdown file in /phase3/ before moving on. Flag any open items where you need my input."*

That gets the next instance up to speed in one prompt.

---

## 8. WORKING STYLE NOTES FOR THE NEXT CLAUDE

David is:
- A 22-year RAAF veteran with ATPL(A) and CPL(H), B737/777/787 line experience (Emirates, Qantas), C-17/C-130 military experience, and a working drone operator (Chief Remote Pilot, DREPL)
- Building A3DM, a substantial enterprise SaaS RPAS platform (Next.js 14, 170+ Supabase tables, CesiumJS, ~150K LOC). He has deep technical chops as a developer AND as a military aviator.
- Talk to him as a senior peer. Don't over-explain aviation, don't over-explain military concepts. Do explain product/build decisions clearly.
- He prefers structured plans with checkpoints, not monolithic output dumps. Commit work to files frequently. Show him deliverables as files, not as walls of text in chat.
- He gives short, sharp directives. Treat that as efficiency, not impatience.
- He uses Cursor as his IDE and works with multiple terminal sessions. He'll be moving between Cowork, Cursor, and his Higgsfield workflow simultaneously.

---

## 9. THE 12 MOST IMPORTANT FACTS FROM THE RESEARCH SO FAR

If you read nothing else, read these. They're the spine of the course narrative.

1. **70% of all Israeli Air Force flight hours during Operation Rising Lion (June 2025, Israel-Iran 12-Day War) were conducted by UAVs, not crewed fighters.**
2. **Russia has launched approximately 57,000 Shahed-136 / Geran-2 one-way attack drones at Ukraine by March 2026.** Ukrainian intercept rate has reached 90%, but each intercept costs 5–25× more than the drone — economic asymmetry is brutal.
3. **Ukraine produced 4 million drones in 2024**, scaling to 200,000 FPVs per month in 2025, from 50+ distributed producers at sub-$500 unit costs.
4. **Russia and Ukraine are each producing ~50,000 fibre-optic FPVs per month** — these are immune to RF jamming and have redefined the close fight.
5. **Magura V5 was the first uncrewed surface vessel in history to sink an enemy warship in combat** (Russian Tarantul-III corvette *Ivanovets*, Feb 2024). Within 12 months: 8 Russian warships sunk, 6 damaged, >$500M damage.
6. **Magura V5 was also the first naval drone to shoot down crewed aircraft** (2× SU-30 fighters + 2× Russian helicopters using R-73/AIM-9-class missiles).
7. **MQ-28A Ghost Bat destroyed a Phoenix target with a live AIM-120 AMRAAM at Woomera on 8 December 2025** — first publicly validated CCA air-to-air kill.
8. **The PLA has operationally deployed GJ-11 Sharp Sword stealth UCAVs to Tibet** (Shigatse, August–September 2025) and revealed a carrier-capable folding-wing variant in the 2025 Victory Day Parade — paired with WZ-7 HALE in a unified reconnaissance-strike complex.
9. **Baykar (Türkiye) is the world's largest UAV exporter by volume** — $2.2 billion 2025 exports, agreements with 37 countries, 83% of revenue from exports. Kizilelma jet-powered UCAV entered Turkish inventory 2026.
10. **Indonesia signed for 60× TB3 + 9× Akinci + Kizilelma in 2025–2026** with local production — the largest Indo-Pacific drone procurement of the decade.
11. **The Replicator initiative was renamed Defense Autonomous Warfare Group (DAWG) in December 2025** and pivoted to focus on *larger* attack drones, after delivering only "hundreds" rather than "thousands" of small attritable systems by the original Aug 2025 deadline.
12. **The US Central Command is now flying LUCAS, a reverse-engineered Shahed-136 clone**, deployed to a squadron in the Middle East from December 2025 — the West has formally adopted the cheap-OWA model it spent three years dismissing.

These twelve facts justify the course's existence. They are the narrative thesis: *the drone has stopped being an exotic capability and is now the dominant character of modern war. Foreign militaries who don't internalise this — at the orbat, doctrine, and procurement level — will lose to those who do.*

---

**END HANDOFF BRIEF**
