# PHASE 1 — MILITARY UAS PLATFORM LANDSCAPE
**Course:** Military Drone Operations — Foreign Military Course (3-day taught + 2-day scenario)
**Classification:** Open-source / unclassified. Flag where public picture diverges.
**Last updated:** 24 May 2026

---

## 1. CLASSIFICATION FRAMEWORK (LECTURE 1, DAY 1)

### 1.1 US DoD UAS Group Classification (JP 3-30 *Joint Air Operations*)

The US Department of Defense (DoD) categorises UAS into five groups by maximum gross takeoff weight (MGTW), normal operating altitude, and airspeed. A UAS exceeding any group threshold is bumped into the higher group, so the system is classified by its most demanding attribute.

| Group | Size | MGTW (lb) | MGTW (kg) | Altitude | Speed (kt) | Examples |
|-------|------|-----------|-----------|----------|------------|----------|
| 1 | Small | 0–20 | 0–9 | <1,200 ft AGL | <100 | RQ-11 Raven, WASP, Puma, Black Hornet 4, Skydio X10D |
| 2 | Medium | 21–55 | 10–25 | <3,500 ft AGL | <250 | ScanEagle, Flexrotor, Switchblade 600, Altius 600 |
| 3 | Large | <1,320 | <600 | <FL180 (18,000 ft MSL) | <250 | RQ-7B Shadow, RQ-21 Blackjack, V-BAT, Hermes 450, Bayraktar TB2, Wing Loong I |
| 4 | Larger | >1,320 | >600 | <FL180 | Any | MQ-1C Gray Eagle, MQ-8B Fire Scout, Heron 1, Hermes 900, Bayraktar TB3 |
| 5 | Largest | >1,320 | >600 | >FL180 | Any | MQ-9 Reaper, MQ-9B SkyGuardian/SeaGuardian, RQ-4 Global Hawk, MQ-4C Triton, Heron TP/Eitan, Bayraktar Akinci, Wing Loong II |

**[GRAPH PLACEHOLDER 1.1A]** — Horizontal bar chart: DoD Groups 1–5 by representative weight and altitude band. Caps shown for plotting only; Groups 4–5 may exceed schematic cap.

**[GRAPH PLACEHOLDER 1.1B]** — Scatter plot: endurance (hours) vs payload (kg) across representative platforms, colour-coded by Group.

### 1.2 NATO Class System (STANAG 4670 / 4671)

NATO uses a parallel three-class system based on MGTW only.

| NATO Class | MGTW | Sub-divisions | Mission level |
|------------|------|---------------|---------------|
| Class I | <150 kg | Micro (<2 kg), Mini (2–20 kg), Small (>20 kg) | Sub-unit / unit tactical |
| Class II | 150–600 kg | Tactical | Formation / brigade |
| Class III | >600 kg | MALE / HALE / Strike/Combat | Operational, theatre, strategic |

**Instructor note:** Foreign military students often arrive familiar with their own taxonomy (e.g. UK's Class 1/2/3, French *catégories*, Israeli *Shoval/Zik/Kohav/Eitan* nicknames). Establish DoD groups as the course working standard early, and map other systems against it on a wallchart.

### 1.3 Mission-Profile Taxonomy (operational use, course working standard)

The taught course will use **role** as the primary organising principle, with platform examples grouped under each:

- **ISR** — Intelligence, Surveillance, Reconnaissance (passive collection)
- **ISTAR** — adds Target Acquisition (active targeting)
- **MALE** — Medium-Altitude Long Endurance (workhorse strike/ISR)
- **HALE** — High-Altitude Long Endurance (strategic ISR)
- **UCAV** — Unmanned Combat Aerial Vehicle (offensive, often stealth)
- **CCA / ACP** — Collaborative Combat Aircraft / Autonomous Collaborative Platforms (loyal wingman)
- **LM / OWA** — Loitering Munition / One-Way Attack drone
- **FPV** — First-Person View (commercial-derivative, often expendable)
- **EW UAS** — Electronic Warfare UAS (jamming, SIGINT/ELINT, decoy)
- **UAS-T** — Target drone (live-fire range training)
- **USV / UUV / UGV** — Surface / Underwater / Ground (cross-domain integration)

---

## 2. FIVE EYES + KEY ALLIES PLATFORMS (Day 1, Lectures 2–4)

### 2.1 United States — Group 5 / MALE & HALE

#### MQ-9B SkyGuardian / SeaGuardian (General Atomics Aeronautical Systems Inc — GA-ASI)
- **Type:** Group 5 MALE / HALE multi-role RPAS, NATO STANAG 4671 certified
- **Engine:** Honeywell TPE331-10 turboprop
- **Wingspan:** ~24 m (79 ft)
- **MTOW:** ~5,670 kg
- **Endurance:** 30–40+ hours
- **Ceiling:** >40,000 ft
- **Speed:** ~210 KTAS (KTAS = Knots True Airspeed)
- **Payload:** 2,155 kg across 9 hardpoints (8 wing + 1 centreline) + 360 kg internal
- **Sensors:** Lynx multi-mode SAR (Synthetic Aperture Radar), MTS-B EO/IR (Electro-Optical/Infra-Red) gimbal, optional 360° maritime search radar, AIS (Automatic Identification System), ESM (Electronic Support Measures), SIGINT/COMINT pods
- **Weapons:** Hellfire, Brimstone, Paveway, JDAM, GBU-39 SDB, long-range standoff munitions in development
- **Roles:** ISR, strike, ASW (Anti-Submarine Warfare) via sonobuoy dispenser pods (AN/SSQ-36, -53G, -62F), Link-16 in-flight target updates passed to friendly missiles, AEW (Airborne Early Warning), comms relay
- **Operators / orders (2026):** UK (Protector RG.1 — 16), Australia (procurement), Japan, Belgium, Poland, Taiwan (first 2 deliveries 2026, supports F-16 Block 70 ramp-up), Germany (5)
- **Combat-relevant:** January 2026 — multi-pod sonobuoy ASW test (first multi-static active coherent buoy release from a UAS). February 2026 — GA-ASI announces long-range standoff munition integration.

#### RQ-4 Global Hawk (Northrop Grumman) — HALE
- **Type:** Group 5 HALE strategic ISR
- **Engine:** Rolls-Royce F137-RR-100 turbofan (7,600 lb thrust)
- **MTOW:** ~14,630 kg
- **Endurance:** 32+ hours
- **Ceiling:** 60,000 ft
- **Speed:** ~310 kt
- **Sensors:** EISS (Enhanced Integrated Sensor Suite) — SAR, EO/IR, SIGINT
- **Armament:** None (pure ISR)
- **Operators:** USAF, NASA, NATO (AGS — Alliance Ground Surveillance), Republic of Korea, Japan (Block 30i), Germany (Triton-replacement)
- **Status:** Block 30 partial retirement underway; Block 40 retained for ground-moving target indicator (GMTI) mission.

#### MQ-4C Triton (Northrop Grumman)
- **Type:** Group 5 HALE maritime ISR (derived from RQ-4)
- **Endurance:** 24+ hours, coverage of 2.7 million sq miles
- **Sensors:** MFAS (Multi-Function Active Sensor) 360° maritime radar, MTS-B EO/IR, ESM/ELINT
- **Operators:** US Navy (68 planned, IOC declared 2023), RAAF (3 of 4 delivered)
- **Mission:** Complements P-8 Poseidon manned MPA (Maritime Patrol Aircraft). Cleared to descend through cloud for closer ID. Re-iced wings allow this vs Global Hawk.

#### MQ-1C Gray Eagle (GA-ASI) — Army Group 4
- US Army's principal armed UAS, Hellfire-capable
- 27 hr endurance, 25,000 ft ceiling

### 2.2 United States — Collaborative Combat Aircraft (CCA) — Day 2 Lecture

**Programme:** USAF CCA Increment 1, A$ contract awarded April 2024. Production decision in FY26. Initial buy 100–150 aircraft. Both prototypes flying as of late 2025.

#### YFQ-42A "Dark Merlin" (General Atomics)
- Derived from XQ-67A Off-Board Sensing Station (OBSS) demonstrator
- Internal weapons bay, 2× AIM-120 AMRAAM (Advanced Medium-Range Air-to-Air Missile)
- First flight: 27 August 2025
- Family designation: "Gambit" UCAV family
- Role: air-to-air augmentation for F-22, F-35, F-47 (Boeing's NGAD selection)

#### YFQ-44A "Fury" (Anduril Industries)
- First flight: 31 October 2025 (Southern California Logistics Airport, Victorville CA)
- 2× weapons stations, 2× AIM-120 AMRAAM
- Service ceiling 50,000 ft, +9/–3 g
- Built around the Anduril Lattice autonomy stack

**[GRAPH PLACEHOLDER 2.2A]** — CCA programme timeline 2024–2030 (contract award → first flights → production decision → IOC)

### 2.3 United States — Group 1–2 (small / SOF / Replicator) — Day 1 Lecture 4

#### Black Hornet 4 (Teledyne FLIR)
- 70 g, 30 min endurance, GPS-denied capable, EO + thermal payload
- Nano-class personal reconnaissance system (PRS)
- In service: US Army SRR (Short Range Reconnaissance), UK, Norway, France, AUS, Germany

#### Skydio X10D (Skydio)
- Nano-class, US Army SRR Tranche 2 winner (delivery May 2025)
- Teledyne FLIR Boson+ thermal (640×512, <30 mK sensitivity)
- VT300-Z 64 MP narrow / VT300-L 50 MP wide visible sensors
- EW-resilient autonomy (visual-inertial SLAM, GPS-denied)
- Operators: US Army, Norway ($9.4M), Spain ($18.7M), Ukraine

#### PDW C100 (Performance Drone Works)
- US Army SRR Tranche 1, heavy quadcopter
- Replicator 1 selected platform

#### Anduril Ghost-X
- Single-rotor helicopter UAS
- US Army SRR Tranche 1, Replicator selected
- Lattice autonomy stack

#### AeroVironment Switchblade family — Loitering Munitions
- **Switchblade 300 Block 20** — squad-level, 15 min endurance, 10 km range, dismount/light-armour kill
- **Switchblade 400** — new mid-tier
- **Switchblade 600** — anti-armour, 40+ min endurance (Block 2: >50 min), 90 km range, tandem-shaped charge warhead
- US Army LASSO (Low-Altitude Stalking & Strike Ordnance) contract: ~$1 billion (2024)
- **Block 2 (Oct 2025 AUSA reveal):** 20% endurance increase, AI-assisted target recognition, GPS-/comms-denied operation. Production 2026.
- FMS (Foreign Military Sales) approved to Taiwan (720× SB300), Ukraine

#### Anduril Altius family — Air-Launched Effects (ALE)
- **Altius 600** — Air-launched, tube-launched, multi-mission (ISR, EW, strike, decoy)
- **Altius 700M** — larger variant
- USAF $50M contract Oct 2025 — Adaptive Airborne Enterprise (A2E)
- MQ-9 Reaper as "mothership" deploying Altius — paradigm-shift TTP
- FMS approved to Taiwan (291× Altius 600M-V)
- Used by US Army Launched Effects Family of Systems (LE-SR / LE-MR)

#### AEVEX Atlas (formerly Phoenix Ghost lineage)
- Group 2 loitering munition
- US Army LE-SR demonstration March 2025

#### Replicator Initiative / DAWG (Defense Autonomous Warfare Group)
- Announced Aug 2023 by then-DepSecDef Hicks
- **Replicator 1:** All-Domain Attritable Autonomous (ADA2) systems — thousands by August 2025 target. CRS reports only "hundreds" actually fielded by deadline.
- **Replicator 2 (Sep 2024):** C-sUAS (Counter-small Uncrewed Aerial Systems) focus
- **Dec 2025:** Renamed Defense Autonomous Warfare Group (DAWG). Now focused on *larger, longer-range* attack drones. SOCOM-led.
- Selected platforms: Switchblade 600, Altius 600, Anduril Ghost-X, PDW C100, plus 7 unnamed swarming-autonomy software vendors.
- Driver: PLA mass — overcome Chinese "more ships, more missiles, more forces" advantage via attritable autonomy.

**Instructor talking point:** Use the Replicator delivery shortfall as a case study in *acquisition reform vs operational reality*. The Pentagon set an explicitly impossible deadline to force the bureaucracy to move; the partial-delivery outcome was the actual goal.

---

### 2.4 United Kingdom

#### StormShroud (Tekever AR3 + Leonardo BriteStorm EW payload)
- **In RAF service from 2 May 2025** — 216 Squadron, first UK ACP (Autonomous Collaborative Platform)
- Tekever AR3 base airframe (Portuguese-designed, UK-manufactured Wales + Southampton)
- Leonardo BriteStorm EW pod (Luton, UK)
- Role: SEAD (Suppression of Enemy Air Defences) — accompany F-35B Lightning II / Typhoon FGR4, jam IADS (Integrated Air Defence System) radars
- 24 aircraft initial buy
- **Combat record (base AR3):** 10,000+ flight hours in Ukrainian service since 2022
- Tekever opening 254,000 sq ft Swindon production facility 2026 — largest UK drone factory, 1,000 jobs, £400M OVERMATCH programme

#### Tekever AR5
- Tactical UAS, larger than AR3
- Project Corvus — Watchkeeper replacement candidate
- £270M UK total Tekever spend since 2022

#### Watchkeeper WK450 (legacy, Thales/Elbit)
- British Army ISR — early retirement announced 2024, in service to at least 2026

#### Project Aether
- Stratospheric ultra-persistent ISR/comms — 3 airframes contracted Jan 2025 (Urgent Capability Requirement)

#### Banshee (QinetiQ)
- Aerial target / threat-replica drone
- Multiple operators (UK, AUS, others)

### 2.5 Australia

#### Boeing MQ-28A Ghost Bat
- **Status (late 2025/early 2026):** Transitioning from technology demonstrator to operational asset, IOC target end of decade (2028 service entry)
- **Dimensions:** 38 ft (11.7 m) length, 24 ft (7.3 m) wingspan, ~7,000 lb (3,175 kg)
- **Contract:** A$1.4 billion total Australian investment, 13 aircraft on contract (initial demonstrators + 6 Block 2 + 1 Block 3 prototype)
- **Latest order:** Dec 2025 — A$754M (US$500.6M) for 7 additional aircraft, including internal weapons bay modification
- **December 2025 milestone:** Live AIM-120 AMRAAM destroyed Phoenix aerial target at Woomera, MQ-28A acting as loyal wingman to E-7A Wedgetail and F/A-18F Super Hornet
- **Air combat chain validated:** Find, Fix, Track, Target — Engage and Assess phases now in progress
- **Block 3 export configuration** — Boeing tailoring for international customers (Singapore Air Show February 2026 announcement)
- **Originally ITAR-free** until 2023 USAF/USN collaboration agreement introduced ITAR-controlled comms and weapons subsystems
- **AIR6015** — Australian Autonomous Collaborative Platforms – Air programme of record
- **Doctrinal context:** Royal Australian Air Force (RAAF) Airpower Teaming System concept — MQ-28 + E-7A Wedgetail + MC-55A Peregrine + F-35A + EA-18G Growler as networked multirole strike/EW node

#### L3Harris MC-55A Peregrine (ISREW — ISR/EW)
- Bombardier G550-derived
- First aircraft accepted by RAAF Edinburgh 24 January 2026 after delays
- Manned, but **plays as the EW/SIGINT command node for MQ-28 swarm** — orbat critical

#### MQ-4C Triton (RAAF)
- 3 of 4 delivered, operates from RAAF Edinburgh / Tindal

### 2.6 Canada / NZ
- **RCAF:** MQ-9B SkyGuardian (Remotely Piloted Aircraft System Project — RPAS), 11 aircraft contract Dec 2023, delivery from 2028
- **NZDF:** Minimal sovereign UAS, leans on coalition ISR

---

## 3. ISRAELI PLATFORMS (Day 1 Lecture 5 — Israeli doctrine module)

**Doctrinal anchor stat:** In Operation Rising Lion (12-Day War, Israel-Iran June 2025), **70% of all Israeli Air Force flight hours were conducted by UAVs**, not crewed fighters. This is the single most important data point for the course on where the air combat balance is heading.

### Israel Aerospace Industries (IAI)

#### Heron TP / Eitan
- Israeli designation: **Eitan**
- Type: Group 5 MALE, "Israeli Air Force workhorse"
- Engine: Pratt & Whitney PT6A-67A turboprop
- Length: 15 m, Wingspan: 26 m
- MTOW: 5,300 kg, payload 1,000 kg, endurance 40 hr
- Speed: >200 kt
- Roles: strategic ISR, strike, SATCOM-relay
- Operators: Israel, India (10 ordered), Germany (lease), Türkiye, Australia (formerly), Greece, Morocco

#### Heron 1 / Shoval
- Israeli designation: **Shoval**
- MALE ISR, 36 hr endurance, 30,000 ft
- Wide global export: Singapore, Australia (retired), India, France, Germany, Brazil, Türkiye, Morocco, Azerbaijan, others

#### Heron MK II
- Rotax 915 iS engine (141 hp), 45 hr endurance, 278 km/h
- Wide-area surveillance (no foreign airspace incursion required)
- Japan candidate for Wide-Area UAV requirement (FY26 budget)

### Elbit Systems

#### Hermes 900 / Kohav
- Israeli designation: **Kohav** ("Star")
- Type: Group 5 MALE, next-gen Hermes 450 successor
- Length 8.3 m, wingspan 15 m, MTOW 1,100 kg, payload 300 kg
- Engine: Rotax 914, endurance 36 hr, ceiling 30,000+ ft
- Roles: persistent surveillance, target acquisition, maritime patrol (Hermes 900 Maritime variant)
- Combat use 2025: located concealed Iranian ballistic missile launchers and mobile air defences in Operation Rising Lion. 4 lost to Iranian SAMs (Surface-to-Air Missiles) over Iran during 12 days.
- Operators (2026): Israel, Switzerland, Philippines, Thailand (Royal Thai Navy — Hermes 900 Maritime $120M), Singapore (announced Nov 2025), Azerbaijan, Brazil, Colombia, Chile, Mexico, Iceland (civil)

#### Hermes 450 / Zik
- Israeli designation: **Zik**
- Tactical MALE, ~20 hr endurance, 10.5 m wingspan
- Widely deployed, being replaced in many fleets

#### SkyStriker (Elbit) — loitering munition
- Used by Israeli ground forces, exported

### IAI / Aeronautics — Loitering Munitions

#### IAI Harop (descended from Harpy)
- Length 2.5 m, wingspan 3 m, RCS (Radar Cross-Section) <0.5 m²
- 6+ hr endurance, 200 km comms range, 417 km/h max speed
- Anti-radiation seeker + EO/IR sensor with man-in-the-loop
- Canister-launched
- **Combat record:** Azerbaijan 2016 + 2020 Nagorno-Karabakh (jam-resistant in GPS-denied), destroyed Syrian SA-22 Greyhound (10 May 2018), Syria strikes Dec 2024, **India strikes on Karachi, Lahore, Rawalpindi May 2025 (India-Pakistan war)**
- Operators: Azerbaijan, India (Indian Air Force designation: P-4), Israel, Morocco, Netherlands, Türkiye

#### IAI Harpy (legacy anti-radiation)
- Anti-radar autonomous loitering munition
- Operators: India, China (copy), Türkiye, Israel

#### Mini Harop
- 1 hr endurance, vehicle-launched canister
- Tactical anti-armour / anti-personnel

#### Aeronautics Orbiter 4
- Group 4 tactical, 14 hr endurance, 12 kg payload (sensors/radar)
- In RSAF service from 2024 ("Close-Range Unmanned Aerial Vehicle")

---

## 4. TURKISH PLATFORMS — Baykar (Day 1 Lecture 6)

**Industrial context:** Baykar set $2.2 billion export record 2025, 83% of all revenues from exports, signed export agreements with 37 countries (36 for TB2, 16 for Akinci). Largest UAV company in the world by export volume.

#### Bayraktar TB2
- Tactical Group 3 UCAV
- Endurance ~27 hr, 4 hardpoints, 150 kg ordnance (MAM-L, MAM-C, BOZOK, ALPAGU)
- Engine: Rotax 912 (100 hp) — TB2 T-AI variant with TM100 indigenous engine flew Feb 2025
- **Combat-proven** in Syria, Libya, Nagorno-Karabakh 2020, Ukraine 2022–2024 (early war kills before Russian EW saturation), Yemen, Mali, Ethiopia
- **Cost:** ~US$5 million per system (vs MQ-9 at $30M) — affordable mass
- Operators: 36 countries — Türkiye, Ukraine, Azerbaijan, Albania, Croatia, Poland, Romania, Pakistan, Mali, Morocco, Maldives, Kenya, Niger, Ethiopia, Libya GNA, Iraq, Kyrgyzstan, Turkmenistan, Bahrain, Qatar, UAE, Indonesia, plus others

#### Bayraktar TB2S
- SATCOM-equipped TB2 for BLOS (Beyond Line of Sight) — favoured by **Japan** for wide-area UAV requirement (FY26 budget, $69.7M for 5 aircraft)

#### Bayraktar TB3
- Naval variant — **first UCAV to take off and land from a short-deck vessel** (TCG Anadolu LHD)
- Foldable wings for ship stowage
- 280 kg payload, 24 hr endurance, SATCOM
- Indonesia ordered 60× TB3 (carrier-capable + land-based, 2025 deal)

#### Bayraktar Akinci
- HALE-class UCAV, 20 m wingspan, 1,500 kg payload, 24+ hr endurance
- Twin engines (variants A/B/C: AI-450T, PT6A-135A, PT6A — 850 hp C-variant test flew Feb 2024)
- Sensors: ASELFLIR-500, MURAD AESA radar (test flew March 2025), SATCOM
- Weapons: full Turkish smart-munition family — MK-82/83 Roketsan TEBER kits, LGK-82, MAM, SOM-A cruise missile, EREN loitering munition (Roketsan, test 2025), TOLUN (ASELSAN), TEBER-82
- **Combat use:** Pençe-Kilit operations vs PKK (Northern Iraq), located Iranian President Raisi's crashed helicopter May 2024
- Operators: Türkiye, Pakistan, UAE, Saudi Arabia, Libya GNA, Mali (2 delivered Nov 2024, both lost — 1 training crash, 1 shot down by Algerian air defences April 2025 after airspace incursion), Indonesia (9 ordered)

#### Bayraktar Kizilelma
- **Türkiye's first jet-powered unmanned combat aircraft**
- Designed for air-to-air, air-to-ground, naval
- **PT-3 prototype: First air-to-air test firing November 2025** — hit target with full accuracy
- **First strike test 8 Oct 2025:** TOLUN munition + TEBER-82 winged guidance kit, both direct hits
- **To enter Turkish inventory 2026**
- Carrier-capable for TCG Anadolu and future Turkish carrier
- **Indonesia first export announced 2026** — Baykar-Republikorp joint venture for local production at Saha facility

### Other Turkish

#### TAI Anka / Anka-S
- TUSAS/TAI MALE, Group 4–5
- Anka-S has SATCOM; Anka-3 stealth flying-wing UCAV in development
- Indonesia ordered 12 Anka-S (first delivered Oct 2025)

#### TAI Aksungur
- HALE-class, twin engine

#### TAI Anka-3
- Stealth UCAV, flying-wing — first flight 2023

---

## 5. CHINESE PLATFORMS (Day 2 Lecture — Adversary Block)

### 5.1 Stealth UCAVs (Group 5)

#### GJ-11 "Sharp Sword" (Hongdu/AVIC)
- Tailless flying-wing UCAV
- Dimensions: 10 m length, 14 m wingspan, ~10 tonne MTOW
- Engine: WS-13 or improved WS-500 turbofan (unconfirmed)
- Endurance ~6 hr, combat radius >1,500 km
- RCS estimated <0.05 m² (B-2-class)
- 2× internal weapons bays, ~2,000 kg payload — LS-6 glide bomb, FT-8C SDB (Small Diameter Bomb)
- **Operationally deployed Tibet (Shigatse Air Base) August–September 2025** — 3 airframes seen via Planet Labs imagery alongside 4× WZ-7 HALE recce drones
- **Public flight debut in formation with J-20 and J-16D November 2025** (PLAAF 76th anniversary)
- **Carrier variant with folding-wing hinges** — Victory Day Parade Beijing 3 Sep 2025
- Type 076 LHD (*Sichuan*) and Fujian carrier embarkation anticipated

#### CH-7 (CASC)
- Larger stealth flying-wing, mysterious — first flight footage Nov 2025 (with vertical tails added — likely for envelope expansion / flight test only)
- ISR-primary, possible UCAV variant
- Two larger flying-wing drones also spotted at Malan test base August 2025

#### "Mysterious Dragon" / new cranked-kite design
- Seen Malan 14 August 2025 — unknown designation

### 5.2 MALE / Strike Drones (Group 4–5)

#### Wing Loong II (GJ-2) — Chengdu/AVIC
- MALE strike-recce, 4,200 kg MTOW
- 370 km/h, 32+ hr endurance
- 6 hardpoints, 480 kg munitions (BA-7 AGM, GB-series LGB)
- EO/IR, SAR, SATCOM
- **Combat record:** Libya (UAE-supported LNA), Saudi Arabia vs Houthi, Pakistan, Nigeria vs Boko Haram, Ethiopia
- **Chinese Coast Guard operational use confirmed Jan 2026** (first non-PLA acknowledgment) — maritime patrol around Taiwan
- **Justice Mission 2025 exercise** (Dec 2025) — Taiwan encirclement deployment
- Operators: China, Egypt, Saudi Arabia (15), Turkmenistan (15), UAE, Pakistan (co-produced 48), Serbia, Algeria, Indonesia (potential)

#### Wing Loong I (GJ-1)
- Earlier MALE, 1,200 kg MTOW
- 13 operators: UAE, China, Egypt, Ethiopia, Indonesia, Kazakhstan, Morocco, Myanmar, Nigeria, Pakistan, Saudi Arabia, Serbia, Uzbekistan

#### CH-4 / CH-4B Rainbow (CASC)
- Reaper-analogue, exported widely (5 to Pakistan, 2 to Saudi Arabia, plus Indonesia, Iraq, Algeria, Jordan)

#### CH-5 Rainbow
- Larger MALE, 16-hardpoint configuration possible

#### CH-7 (covered above)

### 5.3 HALE / ISR

#### WZ-7 "Soaring Dragon"
- HALE strategic ISR, diamond-wing planform
- Operational from 60,000+ ft
- Persistent surveillance across the LAC (Line of Actual Control) into India
- Feeds GJ-11 strike complex (reconnaissance-strike pairing analogue to MQ-4C / MQ-9)

### 5.4 PLA Doctrine Note (for lecture)

PLA is building an integrated **"unmanned reconnaissance-strike complex"** combining:
- **WZ-7** persistent HALE recce
- **GJ-11** stealth strike
- **J-20S** twin-seat (CCA command node)
- **J-16D** EW escort
- Data-link architecture connects all four with AWACS (KJ-500/600) and AI-assisted mission management

This is the PLA's mirror of US Airpower Teaming System and is the **central adversary concept** Five Eyes/JP/SG/ID forces must learn to operate against.

---

## 6. RUSSIAN & IRANIAN PLATFORMS (Day 2 Lecture — Adversary Block)

### 6.1 Russian indigenous

#### Orion (Kronshtadt) — strike MALE
- Russia's MALE equivalent, limited production

#### Forpost (UZGA / Urals Civil Aircraft Plant)
- 17.5 hr endurance, 1,000 lb MTOW, 130 lb payload, 130 mph, 11,800 ft ceiling
- Searcher Mk II derivative (originally Israeli IAI, licensed-built)

#### Orlan-10 (STC) — workhorse tactical ISR
- Artillery spotting, comms relay
- Increasingly vulnerable to Ukrainian EW — being supplemented by SuperCam, ZALA

#### SuperCam S350 (Eniks)
- 3.5 m wingspan, EW-hardened replacement for Orlan-10

#### ZALA 421-16 (Kalashnikov subsidiary)
- 50–70 km range tactical recce

#### ZALA Lancet (Kalashnikov subsidiary) — loitering munition
- **Lancet-3:** 12 kg, 3 kg warhead, 40–70 km range, optical + AI terminal seeker
- Confirmed strikes documented by OSINT analysts: targeting Ukrainian artillery and air defences with meter-level precision
- Now using fibre-optic data link variants

### 6.2 Iranian (and Russian licensed production)

#### Shahed-136 / Geran-2
- **The course-critical platform** — single most important OWA drone story 2022–2026
- Length 3.5 m, wingspan 2.5 m, mass 200 kg, warhead 50 kg (Russia post-2024: 90 kg, multiple warhead variants documented by Conflict Armament Research and Institute for Science and International Security)
- Engine: MD-550 piston (Mado, Iranian copy of Limbach L-550)
- Range 2,500 km
- Speed ~185 km/h ("flying moped" sound profile)
- Guidance: GNSS (GPS originally, Russia replaced with GLONASS then multi-constellation), INS (Inertial Navigation System), potential automatic target recognition
- Launch: rocket-assisted from disguised civilian truck-mounted rail
- **Cost:** US$10,000–50,000 domestic production estimate, $193,000 export (per Iran)
- **Iran-to-Russia transfer (Sep 2022 onwards):** Over 6,000 supplied by 2025 — largest state-to-state combat drone transfer in history
- **Russian licensed production:** Alabuga Special Economic Zone (Tatarstan), Geran-2 designation, 6,000/yr capacity originally, scaled further
- **Total expended against Ukraine:**
  - Sep 2025: ~50,000 (per SBU — Security Service of Ukraine)
  - March 2026: ~57,000
- **Tactical employment:** Saturation barrages — 100/200/400/700+ in single attacks. Mixed with decoys (Gerbera, Italmas/BM-35, Garpiya A1), ballistic missiles (Kh-22, Iskander, Kinzhal), cruise missiles (Kalibr, Kh-101) to fragment and saturate Ukrainian defences
- **Cost asymmetry:** Each intercept costs 5–25× more than the drone — economically unsustainable for defender
- **Ukrainian intercept rate:** Record 90% (Dec 2025 SBU figure)
- **Combat-validated employment:** Ukraine 2022–26, Iranian strikes on Iraqi Kurdistan Sep–Oct 2022, **Iran strikes on Israel April 2024 + 12-Day War June 2025**

#### Shahed-238 / Geran-3
- **Turbojet variant** (TJ150 — Czech-made engine in captured examples)
- ~520 km/h cruise (vs 185 km/h) — much harder to intercept
- Russian domestic production line confirmed by Ukrainian Defence Intelligence Feb 2025

#### Mohajer-6
- Tactical MALE, 12 hr endurance, light strike capability

### 6.3 Counter-clones (US LUCAS / FLM-136)

- US Central Command flying SpektreWorks **FLM-136** target drone, then operational **LUCAS** (Low-Cost Uncrewed Combat Attack System) — both reverse-engineered from captured Shahed-136
- LUCAS announced Dec 2025, Pentagon event reveal July 2025
- US Air Force RFI explicitly requested "form, fit, function" copy for C-UAS development AND combat use

### 6.4 Decoy & Sub-Munition Family (Russian)

- **Gerbera** — cheap decoy/recce
- **Italmas / BM-35** — decoy
- **Garpiya A1** — auxiliary OWA

**Doctrinal lesson for the course:** Russia has built an integrated layered strike doctrine — strike drones + decoys + ballistic + cruise + hypersonic — to overwhelm Patriot, IRIS-T, NASAMS, Gepard, and Skynex defences simultaneously. **Foreign militaries will face this doctrine.** It is exportable to any state-or-non-state actor with $50K per drone.

---

## 7. UKRAINIAN PLATFORMS (Day 1 / Day 2 — central case study)

**Industrial baseline:**
- 2024: 4 million drones produced
- 2025: 200,000 FPV drones/month, ~350,000/month required to match Russian production
- 50+ FPV producers, sub-$500 unit costs, brigade-level procurement
- Distributed production model — Western single-vendor procurement cannot match

### 7.1 FPV (First-Person View) — Day 1 Lecture 4

- Commercial-derivative racing drones (DJI / iFlight / custom) modified for combat
- Operator wears goggles, manual pilot to target, RPG-7 / TM-62 / PG-7 / drop munition payloads
- Cost: $300–$2,000 per drone
- **Effective range:** 5–15 km RF, 25+ km with relay
- **Fibre-optic FPVs:** EW-immune. Russia >50,000/month production by Sep 2025. Ukraine matching with codified procurement.
- **Ukrainian variants by manufacturer:** Vyriy Drone, FlyEye, Dovbush T10, Wild Hornets, others
- **Russian variants:** *Sudoplatov* fibre-optic, *Cube* (ZALA), Lancet-Geran hybrids

**Day 1 instructor talking points:**
1. FPV is the **single most influential battlefield innovation since the RPG-7**
2. It has fundamentally changed the cost-exchange ratio in armour vs anti-armour
3. **Robot-on-robot is now the front line** (Adm Paparo / Emil Michael, Reagan Defense Forum Dec 2025)
4. Western militaries have NO equivalent at scale yet

### 7.2 Long-range OWA (Day 2 Lecture)

- Ukrainian Shahed-analogues — Batyar (DeepStrikeTech, May 2025), Artemis ALM-20 (American-European, Oct 2025)
- Used against Moscow, Rostov-on-Don, Ust-Luga oil terminal

### 7.3 Interceptor drones (Day 2 — Counter-UAS)

- $1,000–$5,000 per interceptor FPV
- 3,000+ enemy drones shot down by Ukrainian interceptors by 2025
- 5× cheaper than Patriot — though less effective per shot
- Production target: 1,000/day

### 7.4 Ukrainian Maritime UAS (Day 2 — Multi-Domain Integration)

#### Magura V5 (HUR / Defence Intelligence)
- 5.5 m length, 5 ft beam, 1.3 ft draft
- 1.1 tonne loaded displacement
- Carbon-fibre V-hull, waterjet propulsion
- Range 400 NM (740 km), cruise 22 kt, max 42 kt (burst 54 kt claimed)
- Payload 705 lb (320 kg) explosive
- Guidance: GPS + INS + FPV via 2× EO cameras, Mesh radio + aerial repeater + SATCOM
- **Combat-historic kills:**
  - First USV (Uncrewed Surface Vessel) to sink an enemy warship in combat — Russian Tarantul-III corvette **Ivanovets** (Feb 2024)
  - 4,000-ton Ropucha-class landing ship **Tsezar Kunikov** (Feb 2024)
  - **Within 1 year: 8 Russian warships sunk, 6 damaged, >$500M damage**
- Cost: $250–300K per unit
- Now equipped with R-73 / AIM-9 derived SAM launchers — **shot down 2× SU-30 fighters and 2× Russian helicopters May 2024 / early 2025** — first naval drone air-to-air kills

#### Magura V7 — armed with Sea Dragon missiles
#### Magura V6P — patrol/recce
#### Magura fibre-optic FPV carrier — opens hatches at sea, launches FPV strikes — paradigm shift

#### Sea Baby (SBU — Security Service of Ukraine)
- 6 m × 2 m × 0.6 m above waterline
- Range originally 600 mi, **now extended to 1,500 km / 930 mi**
- 90 km/h max
- Payload: 850 kg HE warhead OR 2,000 kg cargo OR 6× RPV-16 thermobaric grenade launchers
- New variants Oct 2025: 14.5 mm KPVT Tavriya remote weapon module, twin onboard FPVs, surface-to-air launchers, naval rocket pods
- Crimea Bridge attacks (multiple)
- Total Russian Black Sea Fleet losses Feb 2022 – Nov 2025: **25 vessels sunk or damaged** (mostly to USV + ATGM + ASCM mix)
- Unit cost: ~$245K

### 7.5 Russian counter-USV

#### Skorlupa USV (Russian, serial production claimed Feb 2026)
- Carries fibre-optic FPV drones
- Ukrainian Navy destroyed one Oct 2025

---

## 8. EUROPEAN PROGRAMMES (Day 2 — supplementary)

### 8.1 Eurodrone (Airbus DS / Dassault / Leonardo)
- European MALE RPAS — German lead with France, Italy, Spain
- 16 m length, 26 m wingspan, 13,000 kg MTOW
- Twin GE Catalyst turboprops, 500 km/h, 39,370 ft ceiling, ~30 hr endurance
- ISTAR primary, SAR + EO/IR + tactical SIGINT, open architecture
- Critical Design Review Oct 2025
- **First flight scheduled mid-2027, IOC ~2028, full deliveries 2030**
- Production: 60 aircraft / 20 systems (Germany 21, Italy 15, France 12, Spain 12)
- **Observer nations:** Japan (Nov 2023), India (Jan 2025)
- ~€7.1 billion programme cost
- **France:** Eurodrone and Patroller both deferred in updated 2026 *Loi de Programmation Militaire*

### 8.2 Safran Patroller (France) — programme largely paused
- Tactical UAS, German Stemme S15 airframe base
- First delivery to 61st Artillery Regiment May 2024 (6 years late)
- 28 → 14 → effectively paused 2026

### 8.3 Thales Watchkeeper WK450 (UK, retiring)

### 8.4 nEUROn (Dassault et al)
- Stealth UCAV demonstrator, ended programme

### 8.5 FCAS / SCAF — Remote Carriers
- Future Combat Air System (France/Germany/Spain) — sixth-gen fighter + drone wingman network
- Remote Carriers concept analogous to US CCA

### 8.6 Turgis & Gaillard Aarok (France, low-cost)
- 5.5 tonne MTOW, 22 m wingspan, 1.5 tonne payload — Reaper-class
- ITAR-free, Safran-engine — explicit French sovereignty play

---

## 9. INDO-PACIFIC PROGRAMMES (Day 2 Lecture — Audience-Tailored Block)

### 9.1 Japan

- **FY26 budget:** ¥11.1B ($69.7M) for 5× wide-area UAVs for Ground Self-Defence Force
- **Top candidates:** Bayraktar TB2S (Baykar — testing complete fiscal year 2025, MoD visit Aug 2025) and IAI Heron Mk II
- **JMSDF:** MQ-9B SeaGuardian selected for maritime surveillance near Okinawa — counters Chinese maritime activity
- **Replaces Apache fleet** — drone-for-attack-helo substitution
- **Eurodrone observer (since Nov 2023)**
- **Drone-centric reserve training** anticipated, MHI + Shield AI Hivemind autonomy testing 2025–26

### 9.2 Indonesia (TNI — Tentara Nasional Indonesia)

- Currently fields: 6× CH-4B (51st Air Force Sqn), incoming Anka-S (12 ordered, first delivered Oct 2025)
- **Major 2025 deals:**
  - **60× Bayraktar TB3** (carrier + land variants) — Baykar/Republikorp joint venture, local production
  - **9× Bayraktar Akinci**
  - **Kizilelma** (announced 2026) — first Kizilelma export customer, local assembly at Saha
- **Naval angle:** Eyeing retired Italian carrier *Giuseppe Garibaldi* as drone carrier for TB3 ops
- **Strategic driver:** Archipelagic ISR + South China Sea (Natuna), Malacca/Sunda/Lombok choke points

### 9.3 Singapore (SAF — Singapore Armed Forces)

- **SAF2040 transformation plan** — drone-centric force, technology force multiplier vs manpower constraint
- **RSAF (Republic of Singapore Air Force):**
  - Currently: 5× IAI Heron 1 (2 sqns), 5× Hermes 450 (1 sqn) — both being retired
  - **Hermes 900 announced Nov 2025** — replacement, $120M Elbit contract (originally undisclosed Sep 2025)
  - **Aeronautics Orbiter 4** in service ("Close-Range UAV")
  - **Beat IAI Heron Mk II** in evaluation
- **RSN (Republic of Singapore Navy):** Insitu ScanEagle on Victory-class corvettes
- **Army:** ST Engineering Veloce 15 (replaced Skyblade III), Veloce 60
- **Drone training for all reservists** starting mid-2026 — full national drone-literacy reset

### 9.4 UAE (EDGE Group / ADASI / Halcon)

- **QX family** loitering munitions (homegrown):
  - QX-1 micro VTOL, 3 kg MTOW, 0.5 kg payload, backpack-portable
  - QX-2 mini, 1.5 kg payload
  - QX-3 small UAV, up to 4 guided sub-munitions, 5 kg total
  - QX-4 fixed-wing VTOL, 5 kg payload, 90 min endurance
  - QX-5 VTOL ISR, 25 kg payload, 16 hr endurance
  - QX-6 VTOL cargo, 150 kg payload
- **Shadow 25 / Shadow 50** — GPS-denied video-nav UAV
- **Rash 2 / Rash 2H** — fixed-wing gliding guided munition kit
- **RW-24 Seeker** — thermal automatic seeker
- **Hunter 2 swarming drones** (Halcon) — 8 kg MTOW, AI-coordinated swarm vs jet aircraft on tarmac / vehicle convoys
- **Scorpio-B** — remote weapon system carrier
- **Operates:** Wing Loong II, Bayraktar Akinci, Israeli platforms (covertly historically), MQ-9B (FMS pending)

### 9.5 Korea (RoK)
- KAI MUAV (Korean Air Vehicle), KAERI surveillance UAS
- DPRK uses Russian/Iranian-pattern drones — Kumsong-105 strike, Saetbyul series

### 9.6 India
- Heron TP/Eitan (10 ordered)
- MQ-9B SeaGuardian (15 of 31 for Navy)
- Drishti 10 — Indian variant of Israeli Hermes StarLiner (Hermes 900 family)
- IAI Harop (P-4 designation) — used May 2025 strikes on Pakistan (Karachi, Lahore, Rawalpindi)
- Eurodrone observer (Jan 2025)
- Local: ADE Rustom, Tapas-BH

### 9.7 Taiwan
- MQ-9B SkyGuardian — first 2 deliveries 2026
- FMS: 720× Switchblade 300, 291× Altius 600M-V (June 2025 approval)
- Indigenous: NCSIST Albatross, Teng Yun, Cardinal III

---

## 10. SUMMARY TABLES (for workbook & PowerPoint reference)

### 10.1 Master Platform Matrix — to be built as Excel deliverable in Phase 7

Columns: Platform | Manufacturer | Country | DoD Group | NATO Class | MTOW | Payload | Endurance | Ceiling | Speed | Roles | Sensors | Weapons | Combat-proven | Operators | Cost USD

### 10.2 Top "Combat-Proven Trendsetters" 2022–2026 (course case studies)

| # | Platform | Conflict | Why it matters |
|---|----------|----------|----------------|
| 1 | Bayraktar TB2 | Nagorno-Karabakh 2020, Ukraine 2022 | Made the cheap-MALE-strike model viable; democratised airpower |
| 2 | IAI Harop | Nagorno-Karabakh 2020, India-Pak 2025 | Defined the modern anti-radiation LM |
| 3 | Shahed-136 / Geran-2 | Ukraine 2022–26, Israel 2024 / 2025 | Cost-asymmetry saturation OWA, 57,000+ launched |
| 4 | Magura V5 | Black Sea 2024 onward | First USV to sink warship; first USV air-to-air kill |
| 5 | Ukrainian FPV | Ukraine 2023 onward | Robot-on-robot front line, paradigm shift |
| 6 | Hermes 900 / Heron TP | Israel ops 2024/25 | 70% IAF flight hours UAV during Rising Lion |
| 7 | MQ-28A Ghost Bat | Woomera 2025 (live AMRAAM) | First validated CCA air-to-air kill |
| 8 | GJ-11 Sharp Sword | Tibet deployment 2025 | First operational stealth UCAV outside US/EU/IL |

---

## 11. WORKBOOK QUESTIONS — Day 1 Knowledge Check (draft, for Phase 7)

1. A 2,500 kg UAV with 18-hour endurance at 35,000 ft is which DoD Group? *(Answer: Group 5 — exceeds Group 4 ceiling band)*
2. Name three platforms that have entered service in the last 12 months. *(Sample: StormShroud, MQ-28A Block 2, Anka-S into TNI-AU, Kizilelma PT-3 strike tests, Hermes 900 RSAF)*
3. What percent of IAF flight hours during Rising Lion were UAV? *(70%)*
4. What is the cost-exchange ratio against a Shahed-136 when intercepted by SAM? *(5–25x in defender's disfavour)*
5. Which platform was the first USV to sink an enemy warship in combat? *(Magura V5, Russian corvette Ivanovets, Feb 2024)*

---

## 12. SLIDE DECK PLAN — Day 1 (preview, Phase 7 build)

- **Pack 1: Introduction & DoD/NATO Classification** — 15 slides
- **Pack 2: Five Eyes High-End (Group 4–5 US, UK, AUS)** — 20 slides
- **Pack 3: Israel & Türkiye doctrine + platforms** — 20 slides
- **Pack 4: Small / FPV / Loitering Munitions** — 25 slides
- **Pack 5: Day 1 Tabletop — "What Would You Buy?"** — 10 slides + worksheets

(Total Day 1 ≈ 90 slides, plus exercises)

---

## 13. HIGGSFIELD IMAGE PROMPT LIBRARY — Phase 1

Prompts tuned to documentary-realism for platform slides, with cinematic mood for chapter dividers.

### Master style baseline
`Style: cinematic documentary military photography, desaturated, anamorphic lens, golden hour or overcast, professional defense imagery aesthetic. Negative: cartoon, low quality, watermark, civilian aesthetic, anime, 3D render, video game style.`

### Per-platform prompts (selection)

**[HIGGSFIELD 1.01]** Chapter divider — Day 1 opening
`Subject: silhouette of a MALE-class UAV taking off at dawn from a desert airbase, shot from behind, ground crew watching, runway lights still on, dramatic sky. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 1.02]** DoD Group 5 hero shot
`Subject: MQ-9B SkyGuardian over open ocean banking left, sensor turret deployed, photographed from chase aircraft at the same altitude, white belly, grey upper, no national markings. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 1.03]** CCA loyal-wingman concept
`Subject: a stealth flying-wing UCAV (similar to YFQ-44 Fury) flying in close formation slightly behind and below an F-35 Lightning II at altitude over clouds, both aircraft tilted into a coordinated turn. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 1.04]** Israeli MALE on combat sortie
`Subject: Hermes 900-class MALE UAV silhouetted against dusk sky over arid mountainous terrain, distant smoke plume, sensor turret rotated forward. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 1.05]** Türkiye Kizilelma
`Subject: a jet-powered stealth-shape unmanned fighter banking hard over the Aegean, drop tank under wing, low contrast paint, water haze below. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 1.06]** PLA stealth flying-wing operational
`Subject: a tailless flying-wing stealth UCAV (GJ-11-style, but generic) sitting on an open hardstand at a remote airbase on a high plateau, snow-capped mountains in distance, two ground crew in dark uniforms walking past. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 1.07]** Shahed swarm departure
`Subject: A line of small triangular delta-wing OWA drones (Shahed-136 family) on truck-mounted launch rails, viewed from low angle at twilight, one drone mid-launch with rocket booster firing, dust kicking up. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 1.08]** Ukrainian FPV operator (HUMAN)
`Subject: A camouflaged drone operator wearing FPV goggles, hunched in a trench, gloved hands on a small radio controller, an FPV quadcopter visible launched in foreground, blurred industrial ruins behind. No identifiable national insignia. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 1.09]** Magura V5 USV launch
`Subject: A low-profile carbon-fibre uncrewed surface vessel cutting through dark choppy seas at high speed, V-hull, just two camera turrets and a warhead visible above the deck, twilight, no markings. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 1.10]** Multi-domain orbat panorama (chapter divider)
`Subject: split panoramic composition — top register shows MALE UAV at altitude with sun rays, middle register shows fighter jets and CCA in formation, lower register shows USVs and an FPV in close-up. Cinematic poster style. Aspect: 21:9 ultrawide. Style baseline.`

---

## 14. KEY GLOSSARY ADDITIONS THIS PHASE

(Maintained in `/glossary/master_glossary.md` — global running list. New terms introduced in Phase 1:)

ACP, ADA2, AESA, AEW, AGL, AGM, AI, AIS, ALE, AMRAAM, AROC, ASCM, ASW, ATGM, ATR, BLOS, BOZOK, BVR, C-sUAS, C2, CASC, CASR, CCA, CDR, CDM, COMINT, CRP, DAWG, DepSecDef, DoD, EISS, ELINT, ELP, EMCON, EO/IR, ESM, EW, FAID, FCAS, FMS, FPV, GBU, GMTI, GNSS, GPS, GSDF, HALE, HE, HUR, IADS, ICR, IDR, IFF, INS, ISR, ISTAR, ITAR, JDAM, JMSDF, JSA, KSL (Joint Special Operations), LASSO, LAC, LE-MR / LE-SR, LGB, LHD, LM, LOS, LRU, MAM, MALE, MFAS, MHI, MOSA, MPA, MTOW, MTS-B, NGAD, OBSS, OCCAR, OWA, P-4 (Indian Harop), PESCO, PLA / PLAAF, PNT, RAF, RPAS, RoK, RSAF, RSN, SAR, SATCOM, SDB, SEAD, SIGINT, SLAM, SOM-A, SRR, STANAG, STC, sUAS, TAI, TB2 / TB3 / TBn, TBO, TCG, TEM, TEMPEST, TJ150, TM100, TOLUN, TRL, TPE-331, TUSAS, UAS, UAS-T, UAV, UCAV, UGV, USV, UUV, VTOL, WEZ, WL, WS-13, WSEM, WZ, XLUUV, ZALA

(Definitions will be in the glossary annex — flagged for Phase 7 production.)

---

**END PHASE 1 DOSSIER**
