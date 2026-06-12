# MILSKIL COURSE — PHASE 3–7 WORK PLAN
**Purpose:** A staged, checkpointed plan for completing the Milskil Military Drone Course in Cowork.
**Audience:** The next Claude instance + David.
**Total estimated session work:** 8–12 substantial Cowork sessions, depending on review cycles.

---

## PHASE 3 — LOITERING MUNITIONS & ONE-WAY ATTACK (DEEP DIVE)

**Output file:** `phase3/03_loitering_munitions_owa.md`

**Why this is its own phase:** This is the operational paradigm shift of 2022–2026. The course's whole credibility rests on getting this right. Foreign militaries who skip this lesson lose; those who absorb it win. It deserves its own deep dive separate from the platform survey.

### Research scope
- **Iranian family:** Shahed-101, -131, -136, -238, Mohajer-6 — full evolution tree, components, supply chain
- **Russian family:** Geran-2/3, Lancet-1/2/3, ZALA Cube, Kub, fibre-optic variants, Russian-modified warheads (3+ documented variants per CAR / ISIS), decoy ecosystem (Gerbera, Italmas, Garpiya A1)
- **Israeli family:** Harpy, Harop, Mini Harop, SkyStriker, Orbiter loitering variant, Hero series (UVision)
- **US family:** Switchblade 300/400/600 (Block 2), Altius 600/700, Coyote 2, AEVEX Atlas, Phoenix Ghost, Hatchet, LUCAS, FLM-136
- **Turkish family:** Kargu (STM), Alpagu, Togan, EREN, BOZOK, ALPAGU-D
- **Polish:** Warmate (WB Group), Warmate TUC, Gladius, Warmate-50
- **Ukrainian:** Batyar, Artemis ALM-20, Liutyi, AQ-400 Scythe, Sokol-300, FPV-derivative LM family
- **Chinese:** ASN-301 (Harpy clone), CH-901, CH-817 swarm, Sky Striker analogues
- **South Korean / Japanese / Singaporean / Indonesian / Indian / UAE:** Devil Killer (KR), Kratos Fire Jet, EDGE QX/Hunter 2, Indian Nagastra-1, etc.
- **FPV-as-LM:** the Ukrainian distributed model — why it's different, why it matters
- **OWA at strategic range:** Geran-3 turbojet variant, Ukraine's long-range strikes on Russian oil infrastructure

### Topics to cover beyond platforms
- Cost-exchange ratio mathematics (what one Geran-2 costs vs what a Patriot interceptor costs — full table)
- Saturation doctrine — how 100/200/400/700-drone barrages are constructed: targeting layers, decoys, real munitions, ballistic/cruise overlays
- Production economics — Alabuga model vs distributed model, why the Ukrainian model is more resilient
- Component supply chains and sanctions-evasion (Western microelectronics in Shahed/Geran)
- Targeting cycle — how OWA fits into the kill chain (preset coordinates, automatic target recognition, terminal man-in-the-loop)
- GPS-denied terminal guidance evolution
- Lessons from Israel 12-Day War (Iran's strikes on Israel)
- Lessons from India-Pakistan May 2025 (Harop strikes)
- Lessons from Red Sea (Houthi OWA against shipping)

### Slide pack output (preview)
- **Pack LM-1:** OWA strategic context + paradigm shift (12 slides)
- **Pack LM-2:** Iranian/Russian family detailed (16 slides)
- **Pack LM-3:** Western family — Switchblade, Altius, US LUCAS (12 slides)
- **Pack LM-4:** Israeli + Turkish + emerging producer ecosystems (14 slides)
- **Pack LM-5:** Saturation doctrine + cost-exchange (10 slides)

### Checkpoint
After Phase 3 markdown is complete, commit and ask David to confirm scope before moving to Phase 4. Time check: ~1 substantial Cowork session.

---

## PHASE 4 — COUNTER-UAS (C-UAS)

**Output file:** `phase4/04_counter_uas.md`

### Research scope
The four pillars structure (NATO/US doctrinal model):

**DETECT**
- Radar (Echodyne EchoGuard / EchoShield, RPS-42, MSI Terrahawk, Robin Radar IRIS / Elvira)
- RF detect/DF (DroneShield RfPatrol/DroneSentinel, CRFS, Hidden Level)
- EO/IR (passive panoramic, Thales Aeroscope-style, Squarehead Discovair acoustic)
- Acoustic (Squarehead, Sara Inc, MyDefence)
- Multi-sensor fusion (Anduril Lattice, MARSS NiDAR, Northrop FAAD-C2)

**DECIDE**
- C2 fusion suites (Lattice, NiDAR, FAAD-C2, Northrop Forge / DSU, BAE Trinity)
- AI-assisted target classification

**DEFEAT — Kinetic**
- Gun systems (Skynex/Gepard, Phalanx C-UAS, MSI Terrahawk Paladin, Smart Shooter SmartHopper, Skyranger 30)
- Missile interceptors (Coyote Block 2, MHTK Stinger, AIM-9X-based, IRIS-T SLM, NASAMS)
- Counter-drone-drones / interceptor UAS (Anduril Roadrunner-M, Raytheon Coyote, Aerovironment, Ukrainian interceptor FPVs at 1,000/day target)

**DEFEAT — Non-kinetic**
- EW jammers (DroneShield DroneGun Mk4, Anduril Pulsar, Epirus Leonidas — high-power microwave, Northrop Bushmaster-mounted MMHEL)
- Spoofing (selective GNSS denial, navigation injection)
- Cyber takeover (open-protocol exploits, MAVLink hijack)
- High-power microwave (HPM) — Leonidas, Phaser, IFPC-HPM
- Directed energy laser (DE M-SHORAD, BlueHalo LOCUST, Israeli Iron Beam)
- Nets and capture (SkyWall Patrol, drones-with-nets)

### Crucial doctrine modules
- **Layered defence concept:** detect at 10+ km → decide at 5 km → defeat at 1–3 km
- **Magazine depth vs cost-exchange** — when interceptors run out
- **Soft-kill before hard-kill philosophy**
- **Distinguishing the Class 1/2/3 c-UAS problem** — the Patriot wasn't designed for Shaheds
- **Replicator 2 / DAWG c-UAS focus**
- **Israel Iron Dome adaptations for OWA**
- **Saudi Arabia / UAE Houthi defence lessons**

### Slide pack output
- **Pack CU-1:** C-UAS framework, layered defence (10 slides)
- **Pack CU-2:** DETECT systems (14 slides)
- **Pack CU-3:** DEFEAT — kinetic + interceptor drones (16 slides)
- **Pack CU-4:** DEFEAT — EW, HPM, DEW (14 slides)
- **Pack CU-5:** Doctrine, case studies, magazine math (10 slides)

### Checkpoint
Commit and review before Phase 5. Time: ~1 substantial session.

---

## PHASE 5 — EMERGING TECHNOLOGY HORIZON SCAN

**Output file:** `phase5/05_emerging_tech.md`

### Research scope
- **AI and autonomy:** edge-AI target recognition, swarm coordination, multi-agent reinforcement learning, autonomy stacks (Shield AI Hivemind, Anduril Lattice, Helsing AI), Mission Autonomy Loops
- **Swarming:** US Replicator/DAWG, UK Project Mosquito, Turkish Kargu swarm, UAE Halcon Hunter-2, Chinese CH-817 swarm, Russian "Lavina"
- **Manned-unmanned teaming (MUM-T):** Ghost Bat + E-7, F-35 + CCA, J-20S + GJ-11, FCAS Remote Carrier
- **GPS-denied / PNT alternatives:** vision-based navigation, eLoran, M-code GPS, quantum INS, magnetic anomaly nav, AltiTude inertial fusion
- **Optical / laser communications:** SDA-style mesh, Anduril/General Atomics MLC payloads
- **Runway-independent ops:** STOL/VTOL launch & recovery, ship deck independence, container launch (Quicksink-style)
- **Cross-domain integration:** USV/UUV/UGV teaming with airborne UAS — single mission package
- **Energy:** hybrid-electric propulsion, hydrogen fuel cells, solar HALE (Skydweller), tethered drones
- **Materials:** stealth coatings, low-observable airframes for small drones
- **Cognitive electronic warfare:** AI-driven adaptive jamming
- **Hypersonic UAS** — early concept work
- **Beyond-the-horizon coordination:** Starlink/proliferated LEO mesh as drone backbone (Ukraine lessons)
- **Counter-AI / adversarial ML:** spoofing target recognition, prompt injection of AI decision systems

### Slide pack output
- **Pack ET-1:** AI, autonomy, swarming (16 slides)
- **Pack ET-2:** MUM-T and CCA paradigm (12 slides)
- **Pack ET-3:** PNT, comms, energy, materials (12 slides)
- **Pack ET-4:** Counter-AI and adversarial ML (8 slides)

### Checkpoint
Commit and review. Time: ~1 substantial session.

---

## PHASE 6 — DOCTRINE & TTPs BY NATION

**Output file:** `phase6/06_doctrine_ttps.md`

### Research scope
For each major actor, document:
- **Strategic vision** for UAS in their force structure
- **Force structure** — which units operate what
- **Mission profiles** they actually train and execute
- **Lessons they've actively absorbed** from real conflict
- **Industrial capacity** behind their drone fleet
- **Vulnerabilities and gaps** in their model

Nations to cover:
1. **United States** — DoD UAS strategy, AFSOC A2E, Army's Launched Effects family, Marines stand-in forces, Navy unmanned campaign plan
2. **Russia** — Specnaz drone integration, Lancet-as-PGM-substitute doctrine, Shahed strategic strike
3. **Ukraine** — distributed brigade-level procurement, Magic Lake of innovation, what Western militaries are copying
4. **Israel** — recce-strike pairing in dense urban + standoff peer environments, Operation Rising Lion UAV-centric lesson
5. **China / PLA** — recce-strike complex (WZ-7 + GJ-11), J-20S + CCA, Taiwan Strait posture
6. **Iran** — proxy-export OWA model, mass production, Houthi/Hezbollah TTP propagation
7. **Türkiye** — export-as-strategy, Turkish-pattern operations doctrine (Syria, Libya, Karabakh)
8. **NATO** — joint c-UAS doctrine, multinational interoperability (STANAG)
9. **Australia / Five Eyes** — Airpower Teaming System, AUKUS pillar 2
10. **Singapore / Indonesia / UAE / Japan / Korea / India** — audience-tailored sections

### Slide pack output
- **Pack DT-1:** Adversary doctrine (Russia / China / Iran / DPRK) — 20 slides
- **Pack DT-2:** Allied doctrine (US / UK / AUS / NATO) — 14 slides
- **Pack DT-3:** Audience nations — Israel / Türkiye / Indo-Pacific — 18 slides
- **Pack DT-4:** Ukraine — distributed innovation as a doctrine model — 12 slides

### Checkpoint
Commit and review. Time: ~1 substantial session.

---

## PHASE 7 — PRODUCTION (the big one)

**Output files:** all final deliverables in `/outputs/`

### 7.1 Course architecture document
**File:** `outputs/COURSE_ARCHITECTURE.md` (and matching .pdf)

Final 3-day timetable + 2-day scenario week with:
- Per-lesson learning objectives (LO-1, LO-2, …)
- Per-lesson slide count
- Per-lesson exercises and knowledge checks
- Day-level summary boards
- Scenario library index

**David sign-off required before slide production begins.**

### 7.2 Master PowerPoint template
**File:** `outputs/templates/MIL-DRN-MASTER-TEMPLATE-v1.0.pptx`

All 14 slide layouts from `BRAND_SPEC.md` section 5, built once, applied to every pack. Includes brand assets, fonts, colour theme, classification banners.

### 7.3 Slide packs (the bulk of the work)

| Pack code | Title | Slides | Notes |
|---|---|---|---|
| D1P1 | Introduction & DoD/NATO Classification | 15 | Day 1 opener |
| D1P2 | Five Eyes High-End (US, UK, AUS Group 4–5) | 20 | |
| D1P3 | Israel & Türkiye doctrine + platforms | 20 | |
| D1P4 | Small / FPV / Loitering Munitions intro | 25 | |
| D1P5 | Day 1 Tabletop — "What Would You Buy?" | 10 | Exercise |
| D2P6 | Sensor Architecture | 18 | |
| D2P7 | Weapons & Munitions | 22 | |
| D2P8 | Datalinks & C2 | 14 | |
| D2P9 | PLA Recce-Strike + Iranian Saturation | 15 | |
| D2P10 | Day 2 Syndicate Exercise + Walkthrough | 12 | |
| LM1–LM5 | Loitering Munitions deep dive | 64 | Day 3 morning |
| CU1–CU5 | Counter-UAS deep dive | 64 | Day 3 afternoon |
| ET1–ET4 | Emerging Tech | 48 | Day 3 future-look |
| DT1–DT4 | Doctrine by nation | 64 | Distributed across days as adversary blocks |
| SCN1 | Scenario week briefing overview | 30 | Days 4–5 opener |
| SCN2–SCN6 | Five Red v Blue vignettes | 60+ | Scenario library |

**Approximate total: ~500 slides.** This exceeds the original 350 estimate because the deep dives are richer than first scoped. Recommendation: build all packs, then David curates which to drop for shorter cohort variants.

### 7.4 Workbooks

| Workbook | Pages | Content |
|---|---|---|
| WB-D1 | ~40 | Day 1 — platforms, classifications, knowledge checks |
| WB-D2 | ~40 | Day 2 — sensors, weapons, datalinks, doctrine |
| WB-D3 | ~50 | Day 3 — LM, c-UAS, emerging tech |
| WB-SCN | ~30 | Scenario week — ORBATs, terrain packs, role cards, inject sheets |

### 7.5 Excel matrices

| Workbook | Sheets |
|---|---|
| `MIL-DRN-MATRIX-MASTER.xlsx` | Platforms, Payloads, Weapons, C-UAS, LM, Operators-by-Country, Cost-exchange, Course timetable |

### 7.6 Scenario library

**6 vignettes** scaling permissive → contested → peer-denied. Each:
- Strategic context (1 page)
- Map / terrain pack
- Red ORBAT
- Blue ORBAT
- Inject timeline (90 min tabletop / 4 hr extended)
- Role cards (commander, intelligence, strike, c-UAS, EW)
- Assessment criteria for Directing Staff
- "Blind" mode option — both sides receive their own ORBAT only

### 7.7 Instructor notes

One master document + per-lesson appendices. Includes:
- Talking points (what to say beyond the slide)
- Common student errors and how to redirect
- Classified/unclassified divergence flags
- Recommended further reading
- Train-the-trainer notes (how to deliver this course as a new instructor)

### 7.8 Higgsfield prompt library

All slide-specific prompts batched per pack. Delivered as David completes each pack approval.

### 7.9 Glossary annex

Master running list from all phases, consolidated, defined, cross-referenced.

### 7.10 Certificate template

Per brand spec Section 10.

### Checkpoint structure for Phase 7

David reviews and signs off in this order:
1. Course architecture (before any slide work begins)
2. Master template (one approval gate)
3. Day 1 packs (D1P1–D1P5) — then Day 2 packs — then Day 3 deep dives — then scenarios
4. Workbooks reviewed after their corresponding day packs are finalised
5. Excel, scenarios, instructor notes, glossary, certificate — final pass

**Estimated time:** 4–6 substantial Cowork sessions for Phase 7 production. The bottleneck is not Claude's output — it's David's review cycles and Higgsfield image generation runtime.

---

## SUMMARY TIMELINE (best case, with focused sessions)

| Phase | Sessions | Cumulative |
|---|---|---|
| Phase 3 — Loitering Munitions | 1 | 1 |
| Phase 4 — C-UAS | 1 | 2 |
| Phase 5 — Emerging Tech | 1 | 3 |
| Phase 6 — Doctrine | 1 | 4 |
| Phase 7 — Architecture sign-off + template | 1 | 5 |
| Phase 7 — Day 1 slides + WB-D1 | 1–2 | 6–7 |
| Phase 7 — Day 2 slides + WB-D2 | 1–2 | 7–9 |
| Phase 7 — Day 3 deep dive packs | 2 | 9–11 |
| Phase 7 — Scenarios + Excel + instructor + glossary + cert | 1–2 | 10–13 |

Realistic delivery window: **8–13 focused Cowork sessions.** Add buffer for review cycles, Higgsfield iterations, and any classified-cohort adaptations.

---

**END WORK PLAN**
