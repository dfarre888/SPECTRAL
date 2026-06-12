# SPECTRAL Intelligence Update — Platform & C-UAS Expansion
**Classification:** UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY  
**Source:** OSINT — Open-source research compilation  
**Date:** 2026-06-07  
**Confidence Standard:** NATO (Confirmed / Assessed / Estimated / Reported / Suspected)

---

## 1. JCO Counter-Swarm Technology Programme

### Background
The Joint Counter-small Unmanned Aircraft Systems Office (JCO) runs periodic industry demonstrations to evaluate emerging C-UAS technologies against swarm threats. The 5th demonstration was held at **Yuma Proving Ground, Arizona, June 3–28, 2024**.

### Selection
From **58 proposals**, 9 systems from 8 vendors were selected:

| Vendor | System / Technology | Type |
|--------|---------------------|------|
| Clear Align | Undisclosed | EO/IR |
| Trakka USA Defense | Undisclosed | EO/IR |
| ICR | Undisclosed | RF |
| ELTA North America | Vehicle-mounted system | Radar/EW |
| ELTA North America | Platoon transport system | Radar/EW |
| Teledyne FLIR | Undisclosed | EO/IR |
| SAIC | Undisclosed | Integrated C2 |
| ATSC | Undisclosed | Kinetic |
| **Anduril Industries** | **Pulsar / Anvil** | **EW + Kinetic intercept** |

### Threat Profile Tested
- **40+ UAS targets per session**
- Swarm-mode simultaneous engagements
- Mix of fixed-wing and multi-rotor threats

### Technologies Assessed
1. Guided rockets (kinetic)
2. Kinetic interceptor drones (drone-on-drone)
3. EO/IR cameras (detect/track)
4. RF scanners (detect/ID)
5. RF jammers (defeat)

### Follow-on
- Prototyping of selected proposals planned for 2025
- Pentagon separately testing C-UAS under **electromagnetic attack conditions** (July 2024) — stress test of systems operating under adversary jamming

### SPECTRAL Module Assignment
- **Defeat Matrix** — all 9 systems as defeat system entries; add swarm-engagement effectiveness column
- **Platform Library** — add as distinct system type: "Kinetic Interceptor UAS"
- **Spectrum View** — JCO EW systems span 400MHz–6GHz operational bands

---

## 2. New Threat Platforms

### 2.1 Ukrainian Loitering Munitions & Attack UAS

#### UJ-22 Airborne (UkrJet, Ukraine)
- **Type:** Long-range loitering munition / strike UAS
- **Max speed:** 160 km/h
- **Ceiling:** 6,000 m
- **Range:** 100 km (GCS-controlled) / 800 km (autonomous waypoint)
- **Payload:** 20 kg
- **Guidance:** GPS + autonomous flight computer
- **SPECTRAL modules:** Platform Library, Defeat Matrix, Spectrum View
- **Confidence:** Assessed

#### UJ-26 Bober/Beaver (UkrJet, Ukraine)
- **Type:** Long-range strike UAS (canard layout)
- **Introduced:** 2023
- **Range:** ~1,000 km
- **Payload:** 20 kg
- **Notes:** Canard configuration optimises stability at range; low radar cross-section profile
- **SPECTRAL modules:** Platform Library, Defeat Matrix, Conflict Intel
- **Confidence:** Assessed

#### Baba Yaga Hexacopter (Ukraine/Russia, field-modified)
- **Type:** Heavy-lift combat hexacopter
- **Payload:** Up to 20 kg
- **Range:** Originally ~20 km; upgraded variants up to **60 km**
- **Mission:** Drop bombing (grenades, RPG rounds, modified munitions)
- **Counter:** RF jamming effective; GPS spoofing tested
- **SPECTRAL modules:** Platform Library, Defeat Matrix, Conflict Intel
- **Confidence:** Confirmed (combat employed)

#### Vampire Drone (Ukraine)
- **Type:** Heavy-lift combat hexacopter
- **Payload:** 15 kg+
- **Range:** 60 km
- **Notes:** Larger than Baba Yaga; purpose-built rather than commercial-modified
- **SPECTRAL modules:** Platform Library, Defeat Matrix
- **Confidence:** Reported

#### Kazhan (Ukraine, 2024)
- **Type:** FPV strike drone with AI targeting
- **Capability:** AI targeting assistance, automatic coordinate calculation
- **Significance:** First Ukrainian production drone with integrated AI fire control
- **SPECTRAL modules:** Platform Library, 1v1 Overlay
- **Confidence:** Reported

#### FPV Interceptor Drones (Both sides, 2024)
- **Type:** Anti-drone kinetic interceptor
- **Approach:** FPV drone without payload (faster/more agile than loaded attack drones); EO seeker; drone-on-drone ramming
- **Milestone:** July 2024 — first confirmed FPV drone destruction of a Mi-8 helicopter in combat
- **Counter effectiveness:** Cannot be jammed (kinetic); defeats fibre-optic FPV attack drones
- **SPECTRAL modules:** Platform Library (new type: "Interceptor UAS"), Defeat Matrix, 1v1 Overlay
- **Confidence:** Confirmed

---

### 2.2 Russia — New Autonomous Systems

#### V2U Autonomous Loitering Munition (Russia, 2024–25)
- **Type:** AI-autonomous loitering munition
- **First spotted:** September 2024, Kazan (Tanker Day event)
- **First combat use:** February 2025, Sumy region, Ukraine
- **Wingspan:** 1.2 m
- **Payload:** 3.5 kg (KOFZBCh-3 shaped-charge HEFA warhead)
- **Speed:** 60 km/h cruise
- **Endurance:** Up to 1 hour
- **Launch:** Catapult
- **Propulsion:** Electric motor (brushless, T-MOTOR ESC)
- **AI system:** Nvidia Jetson Orin (GPU-accelerated edge AI)
- **Navigation:** Computer vision — compares live camera feed against pre-loaded terrain imagery; **does NOT require GPS** — specifically designed to defeat Ukrainian EW/GPS jamming
- **Additional sensors:** Downward LiDAR (terrain contour matching)
- **Storage:** 128 GB Chinese SSD
- **Components:** Primarily Chinese (Dualsky motor, Leetoptech PCB); Nvidia Jetson Orin (US-origin, concerning re export control implications)
- **Operational rate:** Reported 30–50/day across multiple front sectors (as of May 2025)
- **SPECTRAL modules:** Platform Library, Defeat Matrix (note GPS-jamming immunity), GNSS Intelligence, Spectrum View, 1v1 Overlay
- **Confidence:** Confirmed (captured hardware analysed)
- **⚠️ DEFEAT NOTE:** Standard RF jamming is INEFFECTIVE against navigation — must target datalink or use kinetic defeat. This is a Defeat Matrix special case.

---

### 2.3 Israeli & Turkish Loitering Munitions

#### IAI Rotem L (Israel)
- **Type:** Quadcopter-based man-portable loitering munition
- **Configuration:** Vertical take-off; quadrotor; no runway required
- **Mission:** Close-support, man-portable strike
- **Guidance:** EO/IIR seeker + operator-in-loop
- **SPECTRAL modules:** Platform Library, Defeat Matrix
- **Confidence:** Confirmed (production system)

#### STM Kargu-2 (Turkey, ROKETSAN)
- **Type:** Rotary-wing autonomous loitering munition
- **In service:** 2018; export approvals from 2021
- **Capability:** Autonomous swarming — uses machine learning to select and engage targets without operator input
- **Significance:** First reported autonomous lethal engagement in conflict (Libya 2020, UN Panel of Experts report)
- **SPECTRAL modules:** Platform Library, Defeat Matrix, Red/Blue Arena (swarm scenarios)
- **Confidence:** Confirmed

#### STM Alpagu (Turkey, ROKETSAN)
- **Type:** Tube-launched fixed-wing loitering munition
- **Weight:** <2 kg
- **Wingspan:** 883 mm
- **Diameter:** 105 mm (tube-compatible)
- **Altitude:** 80–200 m AGL loiter band
- **Range:** 8 km LOS
- **Endurance:** 15 minutes
- **Launch:** Single-operator shoulder-fired tube
- **Notes:** Extreme portability — squad-level organic strike
- **SPECTRAL modules:** Platform Library, Defeat Matrix, 1v1 Overlay
- **Confidence:** Confirmed (production system)

---

### 2.4 Chinese UAS Platforms

#### CAIG Wing Loong I (China, AVIC)
- **Type:** MALE UCAV
- **Length:** 9 m | **Wingspan:** 14 m
- **Max speed:** 280 km/h
- **Payload:** 200 kg
- **Endurance:** 20 hours
- **Operators:** UAE, Pakistan, Saudi Arabia, Egypt, Nigeria, others
- **SPECTRAL modules:** Platform Library, Defeat Matrix, Conflict Intel
- **Confidence:** Confirmed

#### CAIG Wing Loong II (China, AVIC)
- **Type:** MALE UCAV (enlarged Wing Loong I)
- **Configuration:** V-tail, retractable undercarriage
- **First flight:** December 2018
- **Improvement:** Higher payload, longer range vs Wing Loong I
- **Operators:** Similar export footprint to Wing Loong I
- **SPECTRAL modules:** Platform Library, Defeat Matrix, Conflict Intel
- **Confidence:** Confirmed

#### CASC CH-4 Rainbow (China)
- **Type:** MALE UCAV
- **Payload:** 345 kg
- **MTOW:** 1,300 kg
- **Endurance:** 40 hours
- **Cruise:** 205 km/h
- **Operators:** Pakistan, Iraq, Jordan, Saudi Arabia, Myanmar
- **SPECTRAL modules:** Platform Library, Defeat Matrix
- **Confidence:** Confirmed

#### CASC CH-5 Rainbow (China)
- **Type:** MALE/HALE UCAV (China's MQ-9 equivalent)
- **Wingspan:** 21 m
- **Payload:** 1,000 kg
- **MTOW:** 3,000+ kg
- **Ceiling:** 9,000 m
- **Endurance:** 60 hours
- **Range:** 10,000 km
- **Notes:** Comparable to MQ-9 Reaper in capability class; significant C-UAS challenge at altitude
- **SPECTRAL modules:** Platform Library, Defeat Matrix, GNSS Intelligence
- **Confidence:** Confirmed

#### AVIC TB-001 Twin-Tailed Scorpion (PLA)
- **Type:** MALE recon/attack UAS
- **Mission:** ISR + strike; active near Taiwan ADIZ
- **Notes:** PLA-specific; limited export visibility; significant grey-zone operations role
- **SPECTRAL modules:** Platform Library, Conflict Intel
- **Confidence:** Assessed

---

### 2.5 US/NATO Tactical UAS

#### General Atomics MQ-1C Gray Eagle (USA, Army)
- **Type:** MALE UCAV
- **Engine:** 165 hp Thielert Centurion 1.7 (diesel/JP-8)
- **Wingspan:** 56 ft (17 m)
- **Ceiling:** 29,000 ft
- **Endurance:** 25 hours
- **Payload:** 800 lb (360 kg) — 4 hardpoints
- **Armament:** Up to 4× AGM-114 Hellfire OR 8× AIM-92 Stinger
- **Sensors:** AN/ZPY-1 STARLite SAR/GMTI + AN/AAS-52 MTS EO/IR
- **Status:** US Army called it "obsolete" in 2025; procurement ceased per SecDef directive April 2025
- **SPECTRAL modules:** Platform Library, Defeat Matrix
- **Confidence:** Confirmed

#### AAI RQ-7B Shadow (USA, Army — retired)
- **Type:** Group 3 tactical ISR UAS
- **Engine:** 38 bhp Wankel (AR741-1101)
- **Length:** 3.4 m | **Wingspan:** 3.9 m
- **Max speed:** 200 km/h | **Range:** 109 km
- **Endurance:** 7 hours
- **Status:** **RETIRED 2024** — replaced by next-gen systems
- **Historical value:** 20-year Army workhorse; Defeat Matrix baseline for legacy systems
- **SPECTRAL modules:** Platform Library (historical), Defeat Matrix
- **Confidence:** Confirmed

#### Boeing MQ-25 Stingray (USA, Navy)
- **Type:** Carrier-based unmanned tanker (UAS)
- **Engine:** Rolls-Royce AE 3007N turbofan (44 kN)
- **Wingspan:** ~75 ft (22.9 m)
- **Fuel capacity:** 15,000 lb transferable at 500 nm
- **Mission:** Carrier air wing range extension + secondary ISR
- **First test flight:** April 2026
- **Status:** In test; IOC expected late 2020s
- **SPECTRAL modules:** Platform Library (non-combat UAS type: "Carrier UAS/Tanker")
- **Confidence:** Confirmed

---

## 3. New C-UAS and Defeat Systems

### 3.1 Directed Energy Weapons

#### Rafael Iron Beam (Israel)
- **Type:** High-energy laser DEW
- **Power:** 100 kW
- **Range:** 10 km
- **Cost per shot:** ~USD $3 (vs. $50k+ for interceptor missiles)
- **Targets:** UAVs, rockets, mortars, artillery shells
- **Technology:** Adaptive optics for atmospheric distortion correction
- **Status:** First operational delivery December 2025
- **Testing:** Intercepted rockets, mortars, and UAVs in operational testing
- **SPECTRAL modules:** Defeat Matrix (cost-effective high-volume defeat), Spectrum View (laser wavelength band), 1v1 Overlay
- **Confidence:** Confirmed
- **⚠️ DEFEAT MATRIX NOTE:** Extremely high effectiveness against all drone types including fibre-optic FPV; weather-limited (fog, dust, smoke degrade beam); no electronic countermeasure possible

#### Rafael Lite Beam (Israel)
- **Type:** Compact high-energy laser DEW
- **Power:** 10 kW
- **Range:** 2 km
- **Configuration:** Vehicle-mounted (tactical mobility)
- **Introduced:** October 2024
- **Notes:** Squad/vehicle-level laser capability; complements Iron Beam for close engagement
- **SPECTRAL modules:** Defeat Matrix, 1v1 Overlay
- **Confidence:** Confirmed

#### MBDA DragonFire (UK — MBDA + Leonardo UK + QinetiQ + Dstl)
- **Type:** Ship-borne high-energy laser DEW
- **Contract:** £316M, Royal Navy
- **Planned IOC:** Ship-fitted from 2027
- **Milestone:** First high-power aerial intercept January 2024; confirmed drone defeat capability
- **Notes:** Consortium development — most advanced NATO naval laser programme
- **SPECTRAL modules:** Defeat Matrix (naval layer), 1v1 Overlay
- **Confidence:** Confirmed

---

### 3.2 AI-Enabled EW and C-UAS Systems

#### Anduril Pulsar Family (USA)
- **Type:** AI-learning software-defined EW / C-UAS system
- **Variants:**
  - **Pulsar-V** — vehicle-mounted
  - **Pulsar-Alpha** — airborne (UAS-hosted)
  - **Pulsar-L (Lite)** — expeditionary, <25 lb, shoebox size; airborne and ground configs
  - Fixed-site configuration
- **AI capability:** Machine learning spectrum analysis — characterises threats, builds detection/mitigation capabilities, deploys updates in hours to days (not months)
- **Functions:** ESM (passive sensing/classification), direction finding/geolocation, electronic attack (focused jamming), C-UAS defeat
- **Hardware:** GPU array (thousands of CUDA cores), software-defined radio
- **Production:** 100+ LRIP units by end 2025; scaling to thousands/year
- **Contract:** 10-year IDIQ up to $1B with USSOCOM (includes Pulsar, Lattice, Sentry Tower, Anvil)
- **JCO:** Selected for 5th swarm demo 2024
- **SPECTRAL modules:** Defeat Matrix (primary EW C-UAS), Spectrum View (adaptive EW signatures), Platform Library
- **Confidence:** Confirmed

#### Anduril Anvil (USA)
- **Type:** Kinetic interceptor drone
- **Integration:** Managed through Lattice AI C2
- **Mission:** Physical intercept of drone threats; complements Pulsar EW
- **Demonstrated:** Falcon Peak 2025 exercise (mobile C-UAS kit)
- **SPECTRAL modules:** Defeat Matrix, Platform Library (type: "Interceptor UAS")
- **Confidence:** Confirmed

#### DroneShield DroneSentry + Sentrycs Integration (Australia/USA)
- **Type:** Layered C-UAS detect-defeat system
- **Detection:** Multi-sensor (RADA radar, FLIR EO/IR, Echodyne, Bosch)
- **AI:** ML-based swarm detection and threat classification
- **New capability (2025):** Integration with Sentrycs — protocol-level **cyber takeover** of hostile drones (controlled landing, forensic analysis)
- **Portable kit:** RfPatrol Mk2 + DroneGun Mk4
- **Robot integration:** DroneSentry-X Mk2 mounted on Overland AI ULTRA autonomous ground vehicle
- **Avalon 2025:** Major capability upgrade announced
- **SPECTRAL modules:** Defeat Matrix, Spectrum View, Platform Library (type: "Cyber C-UAS")
- **Confidence:** Confirmed

#### Skydio X10D (USA — Blue UAS)
- **Type:** Tactical sUAS (ISR / reconnaissance)
- **Sensor:** Teledyne FLIR Boson+ (640×512, ≤30mK thermal)
- **EW resilience:** Designed for GPS-contested environments
- **Status:** Delivery to US Army began May 2025; Spain MoD EUR 18M order 2025
- **Notes:** Blue UAS compliant (US-manufactured supply chain); counter to DJI supply chain concerns
- **SPECTRAL modules:** Platform Library, 1v1 Overlay (friendly force sUAS)
- **Confidence:** Confirmed

---

## 4. SPECTRAL Database Additions Summary

### platforms Table — New Records

| Platform | Country | Type | Key Range | Module Priority |
|----------|---------|------|-----------|-----------------|
| UJ-22 Airborne | Ukraine | Loitering Munition | 800 km autonomous | Platform Library, Defeat Matrix |
| UJ-26 Bober | Ukraine | Strike UAS | ~1,000 km | Platform Library, Conflict Intel |
| Baba Yaga | Ukraine/Russia | Combat Hexacopter | 60 km | Platform Library, Conflict Intel |
| Vampire | Ukraine | Heavy Combat UAS | 60 km | Platform Library |
| Kazhan | Ukraine | AI FPV Strike | — | Platform Library |
| FPV Interceptor | Multi | Kinetic Interceptor UAS | ~5 km | Platform Library, Defeat Matrix |
| V2U | Russia | AI Autonomous LM | 1 hr endurance | Platform Library, Defeat Matrix |
| IAI Rotem L | Israel | Man-portable LM | VTOL | Platform Library |
| STM Kargu-2 | Turkey | Swarm LM | Autonomous | Platform Library |
| STM Alpagu | Turkey | Tube-launched LM | 8 km | Platform Library |
| Wing Loong I | China | MALE UCAV | 20 hr | Platform Library |
| Wing Loong II | China | MALE UCAV | >20 hr | Platform Library |
| CH-4 Rainbow | China | MALE UCAV | 40 hr | Platform Library |
| CH-5 Rainbow | China | MALE UCAV | 60 hr | Platform Library |
| TB-001 | China/PLA | MALE ISR/Attack | — | Platform Library |
| MQ-1C Gray Eagle | USA | MALE UCAV | 25 hr | Platform Library |
| RQ-7B Shadow | USA | Group 3 ISR | 7 hr (retired) | Platform Library |
| MQ-25 Stingray | USA | Carrier Tanker UAS | 500 nm | Platform Library |
| Anduril Anvil | USA | Kinetic Interceptor | — | Platform Library |
| Skydio X10D | USA | Tactical sUAS | — | Platform Library |

### defeat_systems Table — New Records

| System | Country | Type | Key Capability |
|--------|---------|------|---------------|
| Iron Beam | Israel | HEL DEW | 100kW, 10km, $3/shot |
| Lite Beam | Israel | HEL DEW | 10kW, 2km, vehicle |
| DragonFire | UK | HEL DEW | Ship-borne, naval layer |
| Anduril Pulsar-L | USA | AI EW Jammer | <25lb, adaptive ML |
| Anduril Pulsar-V | USA | AI EW Jammer | Vehicle-mounted |
| Anduril Anvil | USA | Kinetic Interceptor | Drone-on-drone |
| DroneSentry+Sentrycs | AUS | Cyber C-UAS | Protocol takeover |
| JCO Swarm Kit (×9) | USA | Multi-type | Swarm-specific |

### defeat_effectiveness Table — Special Cases to Flag

| Platform | Defeat System | Effectiveness | Note |
|----------|--------------|---------------|------|
| V2U | RF Jammer (nav) | 0% | Computer vision nav; GNSS-free |
| V2U | RF Jammer (datalink) | ~40% | Possible if datalink active |
| V2U | Kinetic / Laser | ~70% | Only reliable defeat |
| Fibre-optic FPV | RF Jammer | 0% | No RF link to jam |
| Fibre-optic FPV | FPV Interceptor | ~60% | Kinetic intercept |
| Kargu-2 swarm | Single RF jammer | ~20% | Swarm saturation degrades effectiveness |
| Any drone | Iron Beam | ~90% | Weather-limited (fog/smoke) |

---

## 5. Supabase Schema Additions

```sql
-- Add new platform type enums
ALTER TYPE platform_type ADD VALUE IF NOT EXISTS 'loitering_munition';
ALTER TYPE platform_type ADD VALUE IF NOT EXISTS 'interceptor_uas';
ALTER TYPE platform_type ADD VALUE IF NOT EXISTS 'carrier_uas';
ALTER TYPE platform_type ADD VALUE IF NOT EXISTS 'combat_hexacopter';
ALTER TYPE platform_type ADD VALUE IF NOT EXISTS 'tube_launched_lm';

-- Add new defeat system type enums
ALTER TYPE defeat_type ADD VALUE IF NOT EXISTS 'directed_energy_laser';
ALTER TYPE defeat_type ADD VALUE IF NOT EXISTS 'kinetic_interceptor_uas';
ALTER TYPE defeat_type ADD VALUE IF NOT EXISTS 'cyber_takeover';
ALTER TYPE defeat_type ADD VALUE IF NOT EXISTS 'ai_ew_adaptive';

-- New column: gnss_independent (critical for Defeat Matrix logic)
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS gnss_independent BOOLEAN DEFAULT false;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS ai_autonomous BOOLEAN DEFAULT false;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS swarm_capable BOOLEAN DEFAULT false;

-- Flag platforms
UPDATE platforms SET gnss_independent = true WHERE slug = 'v2u';
UPDATE platforms SET gnss_independent = true, ai_autonomous = true WHERE slug IN ('v2u', 'kargu-2', 'kazhan');
UPDATE platforms SET swarm_capable = true WHERE slug IN ('kargu-2', 'switchblade-300');

-- New column on defeat_effectiveness: weather_limited, notes
ALTER TABLE defeat_effectiveness ADD COLUMN IF NOT EXISTS weather_limited BOOLEAN DEFAULT false;
ALTER TABLE defeat_effectiveness ADD COLUMN IF NOT EXISTS special_notes TEXT;
```

---

## 6. WOPR Scenario Additions (Red/Blue Arena)

### New Scenario: Autonomous Swarm Attack (JCO-derived)
- **Threat:** 40+ Kargu-2 swarm + 10× FPV drones + 5× Baba Yaga
- **Blue force C-UAS:** Pulsar-L (×2 nodes) + DroneSentry + Iron Beam
- **Key adjudication:** Swarm saturation — at what count does the Blue EW net fail?
- **D10 rule:** Each Pulsar node handles up to 5 simultaneous tracks; roll for saturation at 6+

### New Scenario: GPS-Denied Autonomous Strike
- **Threat:** 30× V2U autonomous LMs (no GPS, no RF link)
- **Challenge:** Standard RF defeat is ineffective; forces kinetic-only response
- **Blue force options:** Iron Beam (if available), Anvil interceptors, Stinger SHORAD
- **Training value:** Demonstrates limits of EW-centric C-UAS doctrine

### New ORBAT Entry: Ukraine Asymmetric UAS Cell
- FPV attack swarm (×20): commercial + fibre-optic mix
- UJ-22 Airborne (×3): long-range autonomous
- Baba Yaga (×5): drop bombing
- FPV Interceptor (×10): anti-drone screen

---

## 7. Cursor Rule Updates Required

### 05-expert-persona.mdc — Add:
- **Swarm Warfare Specialist** — expertise in autonomous swarm tactics, saturation defeat, Kargu/V2U class systems
- **AI Autonomy & Targeting Analyst** — computer vision targeting, GNSS-free navigation, Nvidia Jetson-class edge AI in weapons

### New MDC: 11-swarm-doctrine.mdc
- Swarm threat taxonomy (homogeneous vs heterogeneous)
- Saturation thresholds per defeat system type
- WOPR adjudication rules for swarm engagements

---

*Sources: Defence Express, Long War Journal, FDD, Army Recognition, Defense News, The Defense Post, InsideUnmannedSystems, Breaking Defense, Jane's (open), Army Technology, Naval Technology, Anduril.com, DroneShield.com, Skydio.com*
