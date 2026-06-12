# SPECTRAL PCM — ORBAT Builder
**Classification:** UNCLASSIFIED // SPECTRAL PCM — FOR OFFICIAL TRAINING USE ONLY

A step-by-step guide for DS to build Red and Blue ORBATs for any SPECTRAL PCM scenario. The output populates `red_orbat` and `blue_orbat` in `WORLD_MODEL_TEMPLATE.json`.

---

## Step 1 — Define the Scenario Parameters

Before building the ORBAT, confirm:

| Parameter | Decision |
|---|---|
| Scenario code | SCN-0X |
| Difficulty | Easy / Moderate / Hard |
| Terrain type | Open rural / Urban / Coastal / Island / Arid |
| Duration (turns) | 6 / 8 / 12 / 16 |
| Teaching focus | What decision do you want players to face? |

The ORBAT must be sized to make that decision meaningful. Don't give Blue so many C-UAS assets they trivially win, or so few they trivially lose.

---

## Step 2 — Build Red Force ORBAT

### Red Force Composition by Difficulty

| Difficulty | Primary Threat | Secondary | EW |
|---|---|---|---|
| Easy | 4–6 FPV drones (RC-linked) | None | None |
| Moderate | 8–12 FPV + 2 OWA (Shahed-class) | 1 MALE ISR | Basic RF jammer |
| Hard | 16+ FPV (mix RC + fibre-optic) + 4 OWA | MALE strike asset | Military EW suite |
| Scenario-specific | DS discretion | DS discretion | DS discretion |

### Red ORBAT Principles
1. **Mix guidance types** — if all Red drones are RF-linked, Blue can jam everything. Mix in fibre-optic FPVs to force kinetic engagement.
2. **Stagger timing** — don't launch all platforms simultaneously. Injects handle timing, but the ORBAT should have waves.
3. **Give Red a GCS** — include a GCS position. Blue should be able to find it and face the strike/no-strike decision.
4. **Cost the scenario** — note the approximate USD cost of the Red ORBAT. Use this in the AAR to reinforce the cost-exchange lesson.

### Red ORBAT Template
```
RED FORCE — [Callsign]
Mission: [One sentence — what Red is trying to achieve]
Commander Intent: [Effect, not method]

WAVE 1 (Turn 1–3):
  RED-01 through RED-04: FPV (2.4GHz RC-linked), armed 40mm grenade
  RED-05: Shahed-136, pre-programmed target: [grid]

WAVE 2 (Turn 4–6, inject-triggered):
  RED-06 through RED-09: FPV (fibre-optic), armed 40mm grenade [RF jamming ineffective]
  RED-10: Lancet-3, loitering over [grid] at 300m AGL

GCS: [Grid] — concealed position, radiating on [frequency band]
EW: [None / Type / Capability]

Approximate ORBAT cost: USD [X]
```

---

## Step 3 — Build Blue Force ORBAT

### Blue Force Composition by Difficulty

The Blue ORBAT must create the **magazine depth problem** — enough assets to defend, but not trivially.

| Difficulty | C-UAS Kinetic | RF Jamming | ISR | Kinetic Strike |
|---|---|---|---|---|
| Easy | 12 interceptors (Coyote × 2) | Military-grade jammer | MALE ISR | Available |
| Moderate | 6 interceptors (Coyote × 1) | Commercial DroneShield | Partial ISR | Limited |
| Hard | 4 interceptors (SHORAD only) | RF jammer (degraded) | None | None |

### Blue ORBAT Principles
1. **The magazine depth problem must be real** — if Blue has 20 interceptors against 8 drones, there's no decision. Force scarcity.
2. **Mix defeat systems** — kinetic + RF jammer forces the right tool for the right target decision.
3. **Give Blue an ISR gap** — partial sensor picture makes the scenario interesting.
4. **Include at least one distractor** — a civilian drone, a friendly asset entering the area, something that creates a misidentification risk.

### Blue ORBAT Template
```
BLUE FORCE — [Callsign]
Mission: [One sentence — what Blue is protecting / trying to achieve]
Commander Intent: [Effect, not method]

C-UAS ASSETS:
  BLUE-CUAS-01: [System name], [quantity] interceptors, effective range [X]km
  BLUE-CUAS-02: RF jammer [type], coverage [X]km radius, effective against [RC-linked / GNSS]

ISR:
  BLUE-ISR-01: [Platform type], loitering [grid], sensors [EO/IR/SIGINT]
  Coverage gap: [describe what Blue cannot see]

PROTECTED ASSET:
  [What Blue is defending — HVA, convoy, installation]
  Grid: [Position]

STRIKE CAPABILITY: [Available / Limited / None]
  If available: [Platform, weapon, quantity]

ROE: [Weapons tight / Weapons free / Specific constraints]
```

---

## Step 4 — Balance Check

Before running the scenario, verify:

| Check | Pass condition |
|---|---|
| Outcome is not predetermined | Remove 2 Red assets — can Blue still win? Add 2 Red — can Red still fail? |
| Decision point exists | Is there a moment where the player must choose between two plausible options? |
| Magazine depth problem | Does Blue face a resource constraint that requires prioritisation? |
| Fibre-optic FPV present (Moderate+) | Is at least one Red platform immune to RF jamming? |
| ISR gap present | Does Blue have imperfect situational awareness? |
| Inject will change something meaningful | Will the inject force a real decision, not just information? |

---

## Step 5 — Export to World Model

Copy completed ORBAT into `WORLD_MODEL_TEMPLATE.json`:
- `red_orbat.platforms[]` — one object per platform
- `blue_orbat.platforms[]` and `blue_orbat.c_uas_assets[]`
- `scenario.title`, `scenario.difficulty`, `scenario.duration_turns`
- `weather` — set to create the right tactical conditions for the lesson

Save as: `scenarios/scn-0X-[title]/world_model_v1.json`

---

## Standard ORBAT Library (Quick Reference)

### Red Force Options
| Platform | Guidance | Cost | Jamming Immunity | Ideal Lesson |
|---|---|---|---|---|
| FPV (2.4GHz) | RC-linked | ~$500 | None | Baseline c-UAS, RF jamming works |
| FPV (fibre-optic) | Physical cable | ~$800 | Complete | RF jamming decision — kinetic only |
| Shahed-136 | INS+GPS pre-programmed | ~$20K | Partial (GNSS only) | OWA threat, cost-exchange |
| Lancet-3 | INS + EO loitering | ~$35K | Partial | Precision loitering munition |
| Geran-2 (Shahed-131) | INS+GPS | ~$15K | Partial | Smaller OWA, mass employment |

### Blue C-UAS Options
| System | Type | Effective Against | Magazine | Cost/Shot |
|---|---|---|---|---|
| Coyote Block 3 | Kinetic | sUAS, FPV | 6–12 | ~$50K |
| IRIS-T SLM | Kinetic | OWA, MALE | 8 | ~$300K |
| DroneShield RfPatrol | RF Jammer | RC-linked FPV | Unlimited (EW) | — |
| Military EW suite | RF Jammer | RC-linked + GNSS | Unlimited (EW) | — |
| Laser DEW (HELIOS) | DEW | sUAS, FPV | Unlimited (power) | ~$1/shot |
