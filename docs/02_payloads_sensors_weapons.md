# PHASE 2 — PAYLOADS, SENSORS, WEAPONS, DATALINKS
**Course module:** Day 2 — Sensor & Payload Architecture
**Date:** 24 May 2026

---

## 1. SENSOR PAYLOAD TAXONOMY (Day 2 Lecture 1)

UAS payloads fall into four broad categories. The **same airframe can be reconfigured** across mission profiles by swapping payload pods or gimbals — this is the architectural lesson the course must drive home for foreign militaries debating procurement.

| Category | Sub-types | Primary mission |
|----------|-----------|-----------------|
| **EO/IR** (Electro-Optical / Infra-Red) | EO daylight, MWIR (Mid-Wave IR), LWIR (Long-Wave IR), SWIR (Short-Wave IR), EMCCD low-light | ISR, target acquisition, laser designation |
| **Radar** | SAR (Synthetic Aperture Radar), GMTI (Ground Moving Target Indicator), Maritime Search, AESA fire control | All-weather imaging, surface tracking, GMTI |
| **SIGINT/EW** | COMINT, ELINT, FISINT (Foreign Instrumentation Signals INT), DF/AOA (Direction Finding / Angle of Arrival), jamming, decoy | Emitter geolocation, EW |
| **Specialised** | LIDAR, hyperspectral, CBRN sensors, AIS receiver, sonobuoy dispenser, comms relay, beacon, weapons | Domain-specific niche missions |

**[GRAPH PLACEHOLDER 2.1]** — Sensor spectrum chart: EM frequency from RF to UV showing what each sensor type covers (radio for SIGINT/RDF, microwave for radar, MWIR/LWIR/SWIR thermal bands, visible EO, UV laser designator wavelengths).

---

## 2. EO/IR GIMBALS — TURRET HIERARCHY

### 2.1 L3Harris WESCAM MX-Series (Canadian/US — most widely fielded EO/IR family)

| Model | Weight | Platform tier | Sensors | Range | Notes |
|-------|--------|----------------|---------|-------|-------|
| MX-10 / MX-10D | ~16 kg | Group 1–3, small UAS, helos | EO HD + IR + LRF (Laser Range Finder) + LD (Laser Designator on D-variant) | ~10–15 km LD | Designator-capable low-altitude tactical |
| MX-15 / MX-15D | ~45 kg | Group 3–4, MALE | Multi-sensor + LD | 15+ km LD | Backbone of NATO MALE fleets |
| MX-20 / MX-20D | ~80 kg | Group 4–5, Reaper-class | Multi-sensor 4K + LD + LRF | High-altitude, long range LD | MQ-9 standard, RC-135 manned ISR |
| MX-25 / MX-25D | ~145 kg | Group 5, HALE | Highest performance, multi-spectral | Ultra-long range, high-altitude | Maritime patrol, strategic ISR |

All "D" variants compatible with US/NATO designator codes; auto-detect spot in field of view; auto-slew line of sight to laser energy. Diode-pumped laser target designators ensure high MTBF (Mean Time Between Failures).

### 2.2 Raytheon MTS Family

| Model | Platform |
|-------|----------|
| MTS-A | MQ-1 Predator |
| MTS-B | MQ-9 Reaper, MQ-9B SkyGuardian (standard fit) |
| MTS-C | Next-generation, higher-performance |

### 2.3 Other notable Western turrets

| Model | Manufacturer | Notes |
|-------|--------------|-------|
| Brite Star II / III | FLIR Systems | Common on Bayraktar TB2 (early), helicopters |
| Star SAFIRE 380-HD / 380X | FLIR / Teledyne FLIR | Maritime/border patrol, wide deployment |
| Leonardo Sirius / EOST | Leonardo | Italian/European platforms |
| Leonardo DRS STAG-5 LLD | Leonardo DRS | Class 1 UAS, <5 lb, <6" diameter, TENUM 1280 10-micron LWIR uncooled (Jan 2026 launch) |
| Trakka TC-300 | Trakka | Helicopters, SAR (Search & Rescue) ops |

### 2.4 Turkish ASELSAN

#### ASELFLIR-500
- Successor to CATS (Common Aperture Targeting System)
- **HD Day camera 4096×2880 (4K)**, HD IR + SWIR 1280×720
- Laser designator range 35 km
- Fitted to: Bayraktar TB2, TB3, Akinci, Anka-III
- **Exported to 20+ countries by 2025**, including NATO members (Poland confirmed)

### 2.5 Israeli (Elbit, Controp, IAI ELTA)

| System | Platform |
|--------|----------|
| Controp DCoMPASS | Hermes 450, Hermes 900, small UAS |
| Controp T-STAMP / iSEA-300 | Surveillance, maritime |
| Elbit AMPS | Multi-purpose surveillance |
| IAI/ELTA Mini-POP | Tactical |
| IAI HMOSP | Hermes / Heron |

### 2.6 Chinese

| System | Notes |
|--------|-------|
| AVIC YH-series / CETC turrets | Wing Loong, CH-series payloads |
| KZ-900 / KZ-1000 SIGINT pods | Mature export systems |

### 2.7 Small / FPV class

- DJI H30T (commercial — used heavily in Ukraine for adapted military roles)
- Workswell WIRIS Pro Sc (LWIR + RGB, commercial)
- Sierra-Olympia Ventus
- **Skydio X10D integrated payload:** Boson+ thermal 640×512, <30 mK NETD (Noise Equivalent Temperature Difference), VT300-Z 64 MP narrow, VT300-L 50 MP wide

**[TABLE PLACEHOLDER 2.2A]** — Gimbal comparison matrix: weight, sensor performance, designator range, host platform tier, NATO interop. Build in Phase 7 Excel.

---

## 3. RADAR PAYLOADS

### 3.1 SAR (Synthetic Aperture Radar)

#### GA-ASI / Sandia "Lynx" Ku-band SAR
- Weight <120 lb (~55 kg)
- 15.2–18.2 GHz Ku-band, 320 W peak TX
- **Resolution:** 0.1 m spotlight, 0.3 m stripmap
- Slant range >30–45 km in 4 mm/hr rain
- Modes: Spotlight SAR, Stripmap SAR, GMTI (6 kt MDV, +10 dBsm min target), CCD (Coherent Change Detection) — image-pair comparison for detecting movement/disturbance
- Hosts: MQ-1, MQ-9, MQ-9B, manned platforms
- Real-time motion compensation — image quality maintained during turns

#### Other SAR systems

| System | Manufacturer | Notes |
|--------|--------------|-------|
| SAR/GMTI Modular Mission Payload | Northrop Grumman | RQ-4, MQ-4C |
| PicoSAR / NanoSAR | Leonardo | Compact, mini-UAS class |
| BrightCloud SAR | IMSAR | Tactical UAS, sub-Group 4 |
| EL/M-2055 / -2058 SAR | IAI ELTA | Heron, Hermes 900 |
| TASE-LD / mSAR | UTC Aerospace | Mid-tier |

### 3.2 Maritime Search Radar

| System | Manufacturer | Platform |
|--------|--------------|----------|
| Lynx Maritime / SeaSpray 7500E | GA-ASI / Leonardo | MQ-9B SeaGuardian, Hermes 900 Maritime |
| Searchwater 2000 | Thales | Maritime patrol aircraft, can fit large UAS |
| OceanMaster | Thales | Lighter, UAV-suitable |
| EL/M-2022 / -2032 | IAI ELTA | Heron 1, Hermes 900 |

Common features: ISAR (Inverse Synthetic Aperture Radar) for ship identification, AIS overlay, multi-target tracking, weather penetration.

### 3.3 AESA Fire Control / Air-to-Air Radar

| System | Manufacturer | Platform |
|--------|--------------|----------|
| ASELSAN MURAD AESA | ASELSAN (TR) | Bayraktar Akinci (test fly Mar 2025), Kizilelma (planned) |
| Leonardo Vixen / Raven | Leonardo (UK/IT) | Eurodrone candidates, EU MALE |
| Northrop Grumman APG-83 (SABR) | NGC | Manned, CCA candidate |

### 3.4 GMTI (Ground Moving Target Indicator)

Provides moving target detection regardless of weather/light. Critical for:
- Tracking vehicle movements through cloud cover
- Detecting infiltration / convoy movement at night
- Cueing EO/IR for confirmation

Block 40 RQ-4 Global Hawk and JSTARS replacement use GMTI as primary mission.

**Instructor talking point:** Modern UAS radars are now multimode — single Lynx-class unit performs SAR + GMTI + CCD + ISAR simultaneously. The procurement question for foreign militaries is no longer "EO or radar?" but "how many modes can I afford?"

---

## 4. SIGINT / EW PAYLOADS

### 4.1 SIGINT decomposition

| Sub-discipline | Definition | Typical UAS application |
|----------------|------------|--------------------------|
| **COMINT** | Communications Intelligence — human/text-based voice, data | Intercept enemy tactical/operational radio nets |
| **ELINT** | Electronic Intelligence — non-communication emissions (radar, beacons) | SAM radar geolocation, IADS mapping, electronic order of battle |
| **FISINT** | Foreign Instrumentation Signals INT | Telemetry from adversary weapons testing |
| **OSINT / OPTINT** | Open Source / Optical | Correlated via fusion with airborne SIGINT |

### 4.2 Geolocation techniques

When a UAS detects an emitter, it locates it using:
- **AOA** (Angle of Arrival) — directional antennas, lines of bearing (LOBs)
- **TDOA** (Time Difference of Arrival) — requires multiple receivers
- **FDOA** (Frequency Difference of Arrival)
- **POA** (Power of Arrival) — signal strength gradient
- Multi-aircraft cooperative geolocation produces best fix

### 4.3 Key SIGINT/EW payload systems

| System | Manufacturer | Platform | Notes |
|--------|--------------|----------|-------|
| Kalaetron Integral | Hensoldt (DE) | Platform-independent | 20 MHz – 40 GHz, AI-assisted |
| BAE Tactical SIGINT Payload | BAE Systems (US) | MQ-1C Gray Eagle, future UAS | Next-gen US Army |
| L3Harris RIO / RIO-X | L3Harris | Multiple platforms | Modular SIGINT |
| KZ-900 / KZ-1000 | SIWEE / AVIC (CN) | PLA UAVs | Ku-band+ collection |
| Leonardo BriteStorm | Leonardo UK | **StormShroud (RAF AR3 ACP)** | Active radar jamming, SEAD escort |
| Elbit SkyShield / EW Sentinel | Elbit (IL) | Hermes 900 EW variant | Standoff jamming |
| Rafael SkyShield | Rafael (IL) | Multiple | Threat-adaptive |

### 4.4 EW Mission Modes from UAS

1. **Stand-off escort jamming** — accompany strike package, blind IADS (e.g. StormShroud + F-35)
2. **Stand-in jamming** — penetrate further than crewed assets dare (CCA advantage)
3. **Reactive jamming** — respond to emitter activation in real time
4. **Cyber-electromagnetic effects** — inject false targets, spoof, manipulate
5. **Decoy emitters** — radiate false RCS/signatures to draw fire

**[GRAPH PLACEHOLDER 2.4]** — Schematic of layered EW package: StormShroud forward, F-35B mid, Typhoon trail, MC-55A Peregrine command node, networked via Link-16.

---

## 5. WEAPONS / KINETIC PAYLOADS (Day 2 Lecture 3)

### 5.1 Light micro-munitions (Group 3–4 MALE strike)

| Munition | Origin | Mass | Range | Warhead | Compatible platforms |
|----------|--------|------|-------|---------|----------------------|
| **MAM-C** | Roketsan (TR) | ~6 kg | 8 km | 2.5 kg | TB2, TB3, Akinci, Anka, Aksungur, Karayel, Hürkuş |
| **MAM-L** | Roketsan (TR) | ~22 kg | 15 km | 10 kg | TB2, TB3, Akinci, etc. — TB2's signature weapon |
| **MAM-T** | Roketsan (TR) | ~94 kg | 30–80 km | larger | Akinci first fired Apr 2021 |
| **TEBER-82** kit | Roketsan (TR) | Adds guidance to Mk82/83 | LGB conversion | 500 lb HE | Akinci, Kizilelma |
| **TOLUN** | ASELSAN (TR) | Lightweight | Tactical strike | HE | Kizilelma first shot Oct 2025 |
| **GBU-39 SDB** | Boeing (US) | ~129 kg | 60+ km | 17 kg HE | SkyGuardian, F-35, F-15 |
| **AGM-176 Griffin** | Raytheon (US) | ~20 kg | 5–20 km | 5.9 kg HE | MQ-9, KC-130 |
| **Hatchet** | Northrop Grumman (US) | ~3 kg | gliding | mini | Group 3–4 small UAS |
| **STM Kargu / Alpagu / Togan** | STM (TR) | rotary/fixed | LM | swarm | small UAS, swarm |

### 5.2 Anti-armour / heavyweight ATGM-class missiles

| Munition | Origin | Range | Warhead | Compatible platforms |
|----------|--------|-------|---------|----------------------|
| **AGM-114 Hellfire II** (K/M/N/R variants) | LM/Boeing (US) | 0.5–11 km | HEAT, tandem, MAC, blast-frag | MQ-1, MQ-9, MQ-9B, Apache, Gray Eagle |
| **AGM-114L Longbow Hellfire** | NGC seeker | 11 km | MMW radar fire-and-forget | Apache, MQ-9 |
| **AGM-114R9X "Ninja"** | LM (US) | 11 km | Kinetic blade kill, no explosive | MQ-9 — minimises collateral |
| **AGM-179 JAGM** (Joint Air-to-Ground Missile) | LM (US) | 8+ km | Dual-mode SAL + MMW seeker | MQ-9, Apache replacement |
| **Brimstone 1 / 2 / Sea Spear** | MBDA (UK) | 12–60 km | Tandem HEAT | RAF Typhoon, MQ-9, RPAS — laser + MMW |
| **Spike NLOS** (Non-Line-of-Sight) | Rafael (IL) | 32–50 km | HEAT, frag, blast-frag, dual-purpose | Apache, MQ-9, ground/sea launchers |
| **DRDO Helina / Dhruvastra** | DRDO (IN) | 7–8 km | HEAT | ALH helicopter, UAV trials |
| **Blue Spear / BLOS Spike NLOS variants** | Rafael (IL) | extended | Multi | MUM-T networks |

### 5.3 Glide bombs / general-purpose LGB and GPS-guided

| Munition | Origin | Class | Notes |
|----------|--------|-------|-------|
| **GBU-12 Paveway II** | LM/Raytheon (US) | 500 lb LGB | MQ-9 standard |
| **GBU-10 / -16** | LM/Raytheon (US) | 1,000–2,000 lb LGB | High-end |
| **GBU-38 JDAM** | Boeing (US) | 500 lb GPS-INS | MQ-9, F-35 |
| **GBU-31 JDAM** | Boeing (US) | 2,000 lb | Strategic strike |
| **GBU-53/B StormBreaker (SDB II)** | Raytheon (US) | 200 lb triple-mode | All-weather, moving target |
| **SOM-A / SOM-J** | Roketsan (TR) | Cruise (~250 km) | Akinci stand-off |
| **KEPD 350 Taurus** | MBDA/Saab (EU) | Cruise (500 km) | Manned mainly; UCAV potential |
| **LS-6 / FT-8C** | NORINCO (CN) | Glide / SDB-class | GJ-11, Wing Loong II |

### 5.4 Air-to-air missiles for UCAV / CCA

| Munition | Origin | Range | Notes |
|----------|--------|-------|-------|
| **AIM-120 AMRAAM** | LM/Raytheon (US) | BVR ~160 km (D variant) | YFQ-42, YFQ-44, MQ-28A (Dec 2025 live kill validated) |
| **AIM-9X Sidewinder** | Raytheon (US) | WVR | CCA, MQ-28 potential |
| **MICA / Meteor / IRIS-T** | MBDA (EU) | BVR / WVR | FCAS Remote Carrier integration |
| **PL-15 / PL-21** | CASIC (CN) | BVR | GJ-11, future PLA CCA |

**Doctrinal note:** The MQ-28A's live AIM-120 destruction of a Phoenix target drone (Dec 2025) is the first publicly validated CCA air-to-air kill. This shifts the threat environment — adversary fighters now face the possibility of being engaged by uncrewed wingmen, not just by manned counterparts.

### 5.5 Specialist payloads

| Payload | Mission |
|---------|---------|
| Sonobuoys (AN/SSQ-36 BT, -53G DIFAR, -62F DICASS, MAC) | ASW from MQ-9B SeaGuardian — Jan 2026 multi-static active coherent buoy release (first from UAS) |
| Mk-50/54 lightweight torpedo | Notional future ASW UAS strike |
| ALQ-249/Next Generation Jammer pods | EW |
| LITENING targeting pod | Cross-platform laser designation (manned mostly) |
| Comms gateway/relay (BACN, Link-16 translator) | Battlefield communications backbone |
| Battlefield Airborne Communications Node (BACN) | EQ-4B variant |
| Sensor-suite for Cosmic Radiation, Methane, RF spectrum mapping | Specialist scientific/border surveillance |

---

## 6. DATALINKS & C2 (Day 2 Lecture 4 — short, technical)

### 6.1 Architecture concepts

- **LOS** (Line-of-Sight) — direct radio link to GCS (Ground Control Station). Range typically 150–300 km. Limited by horizon.
- **BLOS** (Beyond Line-of-Sight) — via satellite (SATCOM — Ku, Ka, X, EHF bands), aircraft relay, or HF skywave.
- **Mesh networks** — peer-to-peer between aircraft (drone-to-drone). Critical for swarm operations and EW-resilience.

### 6.2 Common UAS waveforms / link standards

| Waveform | Origin | Notes |
|----------|--------|-------|
| **Link-16** (TADIL-J) | NATO STANAG 5516 | Tactical data network, MQ-9B integration for missile cueing (April 2025 demo) |
| **CDL** (Common Data Link) | DoD | Wideband ISR data return |
| **TCDL** (Tactical CDL) | DoD | Smaller, tactical UAS |
| **VORTEX / SilvusMesh / Persistent Systems MPU5** | Various | MANET (Mobile Ad-hoc Network) tactical radios for FPV/small UAS |
| **STANAG 4609** | NATO | Motion imagery interoperability standard |
| **STANAG 7085** | NATO | Datalink waveforms |
| **STANAG 4671** | NATO | Airworthiness of UAS |
| **MAVLink** | Open / DroneCode | Most common open-source command/telemetry — used by Ukrainian FPV ecosystem |

### 6.3 Resilience to EW

| Threat | Counter | Implementation |
|--------|---------|----------------|
| GPS denial / spoofing | INS, visual-SLAM, celestial nav, M-code GPS, L5 multi-constellation GNSS | Skydio X10D visual-inertial, BlackHornet 4 GPS-denied |
| RF jamming of C2 | Frequency hopping, encrypted spread spectrum, multi-band, **fibre-optic tether** | Russia 50,000/mo fibre-optic FPVs Sep 2025; Ukraine matching |
| C2 disruption | Onboard autonomy, "last waypoint" behaviours, AI target re-engagement | All modern CCA, Switchblade Block 2 |
| Spoofing | Encrypted authenticated waveforms, anti-jam GPS antenna (CRPA — Controlled Reception Pattern Antenna) | Most Group 4–5 platforms |

### 6.4 GPS-denied / contested navigation alternatives

- **Visual SLAM** (Simultaneous Localisation and Mapping) — Skydio X10D, Black Hornet 4
- **Inertial-only mid-course with terminal sensor recognition** — Switchblade 600 Block 2 ATR (Automatic Target Recognition)
- **Terrain-referenced navigation** (TRN) — older but reviving
- **Celestial navigation** — HALE platforms
- **Magnetic anomaly / gravity-aided** — research stage
- **eLoran / pseudolites** — niche
- **Fibre-optic** — for FPV/small UAS only, range-limited

**[GRAPH PLACEHOLDER 2.6]** — Datalink resilience matrix: threat axis (jam, spoof, intercept, denial) vs counter (waveform, antenna, autonomy, fibre).

---

## 7. PAYLOAD-PLATFORM COMPATIBILITY TABLE (excerpt — to build full in Phase 7)

| Platform | Standard EO/IR | Standard radar | SIGINT | Standard weapons |
|----------|----------------|----------------|--------|-------------------|
| MQ-9B SkyGuardian | MTS-B / MX-25 | Lynx multi-mode + maritime | RIO-X / Hensoldt | Hellfire, Brimstone, Paveway, JDAM, SDB |
| MQ-9 Reaper | MTS-B | Lynx | Modular pod | Hellfire, Paveway, JDAM |
| RQ-4 Global Hawk | EISS (HISAR + EO/IR) | EISS SAR/GMTI | EISS SIGINT | None |
| MQ-4C Triton | MTS-B + MFAS | MFAS 360° maritime | ESM/ELINT | None |
| Heron TP / Eitan | DCoMPASS / HMOSP | EL/M-2055 | IAI ELINT | Hellfire-class national integrations |
| Hermes 900 / Kohav | DCoMPASS | EL/M-2022 maritime variant | Elbit SkyShield | National (Spike NLOS, etc.) |
| Bayraktar TB2 | ASELFLIR-200 / -300 / -500 | None (LOS optical only) | None standard | MAM-C, MAM-L, BOZOK, ALPAGU |
| Bayraktar TB3 | ASELFLIR-500 | None | None | MAM-T, TEBER-82 |
| Bayraktar Akinci | ASELFLIR-500, MURAD AESA | MURAD | National | Full Turkish family — SOM-A, EREN, TOLUN, MAM-T |
| Bayraktar Kizilelma | EO/IR + MURAD planned | MURAD | National | Air-to-air + air-to-ground full family |
| Wing Loong II | AVIC EO/IR + SAR | AVIC SAR | KZ-pod | BA-7 AGM, GB series LGB |
| GJ-11 Sharp Sword | LO-optimised internal | None public | Unknown | LS-6, FT-8C SDB-class |
| MQ-28A Ghost Bat | Modular bay (sensor TBD) | Modular bay | Modular | AIM-120 AMRAAM (validated) |
| YFQ-44 Fury | Modular | Modular | Modular | 2× AIM-120 AMRAAM |
| Shahed-136 | None | None | None | Internal 50 kg (90 kg post-2024) HE warhead |
| Magura V5 | EO twin camera | None | None | Up to 320 kg HE, R-73/AIM-9-derived SAM |

---

## 8. PROCUREMENT GUIDANCE FOR FOREIGN MILITARIES (Day 2 Lecture 5 — syndicate exercise)

Decision tree the course will teach students to apply:

1. **What is your operational requirement?** ISR-only, ISTAR, light strike, heavy strike, EW, naval, swarm?
2. **What threat environment?** Permissive, contested, denied?
3. **What national sovereignty constraints?** ITAR / EU exports / Chinese reliance / co-production demands?
4. **What sustainment depth?** Spare parts pipeline, training pipeline, depot maintenance, software updates over 10–15 years?
5. **What budget envelope?** TB2 ($5M/unit, mass affordable) vs MQ-9B ($30M+ unit, premium) vs Reaper-class with full sensor suite ($100M+ for full system).
6. **What payload flexibility?** Open-architecture (MOSA — Modular Open Systems Architecture, e.g. MQ-9B, MQ-28, AR3) vs proprietary closed-suite (older platforms, some Chinese).
7. **What data sovereignty?** Where does the sensor data flow? Through whose cloud? Whose intel agencies see it?

**Workbook exercise (Day 2 syndicate):** *"You are the air staff of a small island state with 2,800 km of coastline, a $200M annual UAV procurement envelope, no existing MALE fleet, and a primary threat of grey-zone maritime incursion. Build a 5-year force structure recommending platform / payload / weapon combinations. Justify."*

---

## 9. SLIDE DECK PLAN — Day 2 (preview, Phase 7 build)

- **Pack 6: Sensor Architecture** — 18 slides
- **Pack 7: Weapons & Munitions** — 22 slides
- **Pack 8: Datalinks & C2** — 14 slides
- **Pack 9: PLA Reconnaissance-Strike Complex & Iranian Saturation** — 15 slides (adversary block)
- **Pack 10: Day 2 Syndicate Exercise + Walkthrough** — 12 slides

(Total Day 2 ≈ 81 slides + handouts)

---

## 10. HIGGSFIELD IMAGE PROMPTS — Phase 2

Style baseline as Phase 1.

**[HIGGSFIELD 2.01]** EO/IR turret close-up
`Subject: Detailed close-up of a multi-sensor EO/IR gimbal turret on the nose of a grey MALE drone, sun reflecting off the gimbal glass, photographed from below, dramatic angle. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 2.02]** SAR ground-trace concept (technical)
`Subject: split-frame composition — left side shows a UAV at altitude with radar beam visualised as a translucent fan reaching to a desert valley; right side shows the SAR-generated black-and-white image of the same valley revealing buried vehicles and hidden structures. Aspect: 21:9. Style baseline.`

**[HIGGSFIELD 2.03]** SEAD escort with StormShroud-style EW drone
`Subject: A small fixed-wing drone (Tekever AR3-style) flying low through mountainous terrain at dusk, with a Typhoon-class fighter visible at higher altitude in background, RF energy visualised faintly as warped air around the small drone. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 2.04]** Hellfire release from Reaper
`Subject: A grey MALE drone (MQ-9 family generic) photographed from below as a Hellfire missile clears the pylon, motion blur, flash visible from rocket motor ignition, target horizon below. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 2.05]** Loitering munition with battery launcher
`Subject: Multiple tube-launched loitering munitions (Switchblade-style) erupting from a launcher rack on the back of a 4x4 vehicle, twilight, dust, two operators with helmets and laptops. Aspect: 16:9. Style baseline.`

**[HIGGSFIELD 2.06]** Ground Control Station interior
`Subject: A dim, blue-lit ground control station interior with two operators in flight suits at multi-monitor consoles, infrared video feed visible on one screen, map with track lines on another. Aspect: 16:9. Style baseline.`

---

## 11. GLOSSARY ADDITIONS THIS PHASE

AESA, AGM, AIM, AIS, ASCM, ASW, ATR, AVIC, BAE, BLOS, BACN, BRD (Battle Rhythm Display), CCD (Coherent Change Detection / Coalition Combat Drone — context), CDL, CETC, CLD, CRPA, dBsm, DCoMPASS, DICASS, DIFAR, ELINT, ELTA, EMCCD, EW, FDOA, FISINT, GBU, GCS, GMTI, GNC, HE, HEAT, HMOSP, HUMINT, IADS, IMINT, ISAR, JAGM, JDAM, KZ-900, LD, LO (Low-Observable), LOB, LOS, LRF, LWIR, MAC (Metal Augmented Charge), MAM, MANET, MAVLink, MDV, MFAS, MMW, MOSA, MTBF, MTS, MWIR, NCSIST, NETD, OBSS, OPTINT, OSINT, PL-15, POA, POP (Plug-in Optronic Payload), RPV, RF, RIO, RPAS, SDB, SDR, SEAD, SiGINT, SLAM, SOM-A, SWIR, TADIL-J, TCDL, TDOA, TEBER, TENUM, TM-62, TMI (Temporary Management Instrument), TPE-331, TRN, TRP, WGM, WSEM

---

**END PHASE 2 DOSSIER**
