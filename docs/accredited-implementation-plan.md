# SPECTRAL — Accredited Environment Implementation Plan

**Document status:** DRAFT — Architecture and integration specification  
**Classification:** UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY  
**Author:** SPECTRAL Engineering  
**Date:** 2026-06-16  

---

## 1. Purpose

This document describes the **accredited environment extension** of SPECTRAL — the technical layer that replaces open-build placeholder data with controlled performance values (Pk tables, EW effectiveness, platform kinematics, seeker characteristics) without modifying the open build architecture.

The open build is deliberately designed around this separation. Every placeholder in the open build is a deliberate handoff point. This plan specifies what fills those placeholders in the accredited environment, how controlled data flows in, and which PCM engine functions are enhanced.

**What this plan covers:**
- Accredited database schema (new tables, access controls, provenance fields)
- PCM adjudication enhancement points (which functions, which parameters change)
- Integration architecture (how accredited data reaches the PCM without touching the open build)
- Data governance model (classification, provenance, review gate)
- Currency engine handoff (how open-build proposals translate into accredited implementations)
- Migration path (existing exercises are unaffected; accredited layer is additive)

**What this plan does not contain:**
- Actual controlled data values. Platform specifications, Pk tables, EW effectiveness parameters, range tables, and seeker performance data are populated by authorised personnel within the accredited environment using approved sources. This document specifies the container, not the payload.

---

## 2. Open-Build Handoff Points

The following structures in the open build are designed as accredited handoff points. They work without accredited data (using OSINT-proxied fallbacks), and are overridden when accredited data is present.

### 2.1 Currency Engine — Approved Updates

```typescript
// lib/moat/currencyEngine.ts
currencyEngine.getPublishable(updates: CurrencyUpdate[]): CurrencyUpdate[]
// Returns: approved updates ready to inform training content or scenario work.
```

Approved currency updates are the open-build handoff list. When an update requires controlled performance data (Pk, kinematics, EW effectiveness), the accredited team implements it manually in the accredited tables and records the link in `spectral_accredited_currency_implementations`. There is no automatic routing flag on the update record — SME judgement drives which approved items receive accredited implementation.

### 2.2 DefeatMatrix — OSINT Proxy Fallback

```typescript
// lib/defeat/defeatMatrix.ts — DefeatMatrixCache
// Current open-build behaviour: loads from spectral_defeat_matrix (Supabase)
// with an offline fallback. Values are OSINT-proxied capability bands,
// not validated Pk tables.
// Accredited override: AccreditedDefeatMatrix extends this, loaded when
// SPECTRAL_ACCREDITED=true, and takes precedence over the open-build cache.
```

### 2.3 `adjudicatePcmPairFromCtx()` — Pk Lookup

```typescript
// lib/pcm/pcm-pair-adjudication.ts
// Returns: { combinedBlueSuccessPct, inRange, isImmune }
// Open build: combinedBlueSuccessPct is derived from the OSINT DefeatMatrixCache
// Accredited: combinedBlueSuccessPct is looked up from spectral_accredited_defeat_matrix
// via the AccreditedDataLayer injected into AdjudicationContext
```

### 2.4 `resolveEwCombat()` — Fixed EW Coefficient

```typescript
// lib/pcm/ew-combat-resolver.ts — line 33
ewInterceptPenalty = Math.min(0.4, ewInterceptPenalty + activeRedEw.length * 0.08);
// Open build: fixed +0.08 per active Red EW asset (OSINT proxy)
// Accredited: per-asset effectiveness loaded from spectral_accredited_ew_assets
// Each asset has: frequency_bands_hz[], effective_range_km, eirp_dbm,
// target_system_types[], pk_vs_gnss_dependent, pk_vs_datalink_rf
```

### 2.5 `buildInboundQueue()` — Platform Kinematics

```typescript
// lib/pcm/swarm-saturation.ts → computeThreatTti()
// lib/pcm/threat-kinematics.ts
// Open build: speed_kt from platform record (OSINT-approximated)
// Accredited: speed, altitude_m, radar_cross_section_m2, acoustic_signature_db
// loaded from spectral_accredited_platform_specs per platform type
```


### 2.7 Map Intel — Platform RCS (`getRcsFacets`)

```typescript
// lib/spectral/detectionPhysicsConstants.ts
getRcsFacets(platformId, categoryFallback?)
// Open build: PLATFORM_RCS_CATALOGUE OSINT nominals; SOVEREIGN_CORE_BOUNDARY entries
// return geometry-inference facets only (never controlled σ).
// Accredited override: lib/operations/accredited-rcs-resolver.ts intercepts before
// DetectionFieldEngine.pdAtPoint() when SPECTRAL_ACCREDITED=true.
```

### 2.6 `ForceDesignReport.data_provenance`

```typescript
// lib/moat/forceDesignEngine.ts
data_provenance: 'open_build_placeholder' | 'accredited_catalogue' | 'sme_input' | 'after_action'
// Open build always sets 'open_build_placeholder' on engagement-outcome findings.
// Accredited build sets 'accredited_catalogue' when findings reference controlled data.
```

---

## 3. Accredited Database Schema

All accredited tables live in the Supabase instance of the accredited environment. They share the same schema namespace as the open build but are behind an additional RLS role gate (`accredited_user`). The open-build Supabase instance has no knowledge of these tables.

### 3.1 `spectral_accredited_ew_assets`

EW systems with controlled specifications. Replaces the generic EW effectiveness coefficient in `resolveEwCombat()`.

```sql
CREATE TABLE spectral_accredited_ew_assets (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  designation             text NOT NULL,        -- system designation
  manufacturer            text NOT NULL,
  country_of_origin       text NOT NULL,
  variant                 text,                 -- block/mod variant if applicable
  spectral_platform_id    text,                 -- links to spectral_platforms.id in open build

  -- Frequency characteristics
  frequency_min_hz        bigint NOT NULL,      -- Hz
  frequency_max_hz        bigint NOT NULL,      -- Hz
  frequency_bands         text[] NOT NULL,      -- e.g. ['L1','L2','L5','S','C','X']
  modulation_modes        text[],               -- e.g. ['CW','swept','DRFM']

  -- Effectiveness parameters (controlled)
  effective_range_km      numeric(8,3),         -- km, boresight
  eirp_dbm                numeric(6,1),         -- dBm effective isotropic radiated power
  power_output_w          numeric(8,1),         -- W peak output
  antenna_gain_dbi        numeric(5,1),

  -- Engagement effectiveness (Pk per target type — controlled, SME-validated)
  pk_vs_gnss_dependent    numeric(4,3),         -- 0.000–1.000
  pk_vs_rf_datalink       numeric(4,3),
  pk_vs_fsoc              numeric(4,3),         -- fibre-optic defeats this; should be ~0
  pk_vs_inertial_nav      numeric(4,3),

  -- PCM integration flags
  ew_immune_defeat        boolean DEFAULT false, -- whether this defeats ew_immune platforms
  affects_comms_status    text DEFAULT 'degraded_light', -- comms_status value to apply
  link_health_drop_pct    integer DEFAULT 12,   -- drop per active asset in resolveEwCombat

  -- Provenance and governance
  data_classification     text NOT NULL DEFAULT 'UNCLASSIFIED',
  handling_caveats        text[] NOT NULL DEFAULT '{}',
  source_authority        text NOT NULL,        -- e.g. 'DSTG TR-2024-001'
  source_reference        text NOT NULL,
  last_validated_at       timestamptz NOT NULL,
  validated_by            text NOT NULL,        -- authorising SME
  validation_notes        text,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Access: accredited_user role only
ALTER TABLE spectral_accredited_ew_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accredited_read" ON spectral_accredited_ew_assets
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'user_role' = 'accredited_user');
```

### 3.2 `spectral_accredited_defeat_matrix`

Replaces the open-build `DefeatMatrixCache`. Holds per-pair Pk values for each defender platform versus each threat type.

```sql
CREATE TABLE spectral_accredited_defeat_matrix (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Platform pair
  defender_type           text NOT NULL,        -- e.g. 'Coyote Block 3'
  defender_group          text NOT NULL,        -- c_uas_defeat_kinetic | ew | dew
  threat_type             text NOT NULL,        -- e.g. 'Shahed-136'
  threat_group            text NOT NULL,        -- OWA | FPV | loitering_munition | decoy

  -- Engagement envelope
  min_range_km            numeric(6,3),
  max_range_km            numeric(6,3),
  min_altitude_m          integer,
  max_altitude_m          integer,
  max_target_speed_kt     integer,

  -- Probability of kill (controlled — per engagement condition)
  pk_nominal              numeric(4,3) NOT NULL, -- clear, frontal, nominal conditions
  pk_head_on              numeric(4,3),
  pk_tail_chase           numeric(4,3),
  pk_ew_degraded          numeric(4,3),          -- Blue EW environment degraded
  pk_saturation           numeric(4,3),          -- >8 simultaneous inbounds
  pk_night                numeric(4,3),
  pk_low_confidence       numeric(4,3),          -- firing on 'possible' contact

  -- Immunity flags
  is_immune_to_ew         boolean DEFAULT false,
  is_immune_to_dew        boolean DEFAULT false,
  notes                   text,

  -- Provenance
  data_classification     text NOT NULL DEFAULT 'UNCLASSIFIED',
  handling_caveats        text[] NOT NULL DEFAULT '{}',
  source_authority        text NOT NULL,
  source_reference        text NOT NULL,
  last_validated_at       timestamptz NOT NULL,
  validated_by            text NOT NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  UNIQUE (defender_type, threat_type)
);

ALTER TABLE spectral_accredited_defeat_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accredited_read" ON spectral_accredited_defeat_matrix
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'user_role' = 'accredited_user');
```

### 3.3 `spectral_accredited_platform_specs`

Replaces OSINT-approximated speed/altitude/signature values in `buildInboundQueue()` and `computeThreatTti()`.

```sql
CREATE TABLE spectral_accredited_platform_specs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  designation             text NOT NULL UNIQUE,
  spectral_platform_id    text,                 -- links to spectral_platforms.id in open build
  platform_group          text NOT NULL,        -- OWA | FPV | loitering_munition | decoy | c_uas_*

  -- Kinematics (replaces open-build speed_kt, altitude_m)
  speed_cruise_kt         integer,
  speed_max_kt            integer,
  speed_noe_kt            integer,              -- NOE profile speed (after adaptRedForce NOE)
  altitude_cruise_m       integer,
  altitude_noe_m          integer,              -- NOE profile altitude
  range_km                numeric(8,2),
  endurance_min           integer,

  -- Signature (feeds fog-of-war sensor model)
  radar_cross_section_m2  numeric(8,6),         -- m², broadside
  acoustic_signature_db   numeric(5,1),         -- dBSPL at 100m
  thermal_signature_band  text,                 -- 'lwir' | 'mwir' | 'swir' | 'none'
  rf_emission_profile     text,                 -- 'none' | 'link_only' | 'active_fh'

  -- Seeker / guidance (controlled)
  guidance_primary        text,                 -- 'rf_datalink' | 'inertial' | 'fsoc' | 'gnss' | 'tv'
  guidance_secondary      text,
  gnss_dependent          boolean DEFAULT true,
  ew_immune               boolean DEFAULT false, -- fibre-optic or fully autonomous

  -- Warhead / effect (controlled — for force design, not open build training)
  warhead_type            text,
  warhead_mass_kg         numeric(6,2),

  -- Provenance
  data_classification     text NOT NULL DEFAULT 'UNCLASSIFIED',
  handling_caveats        text[] NOT NULL DEFAULT '{}',
  source_authority        text NOT NULL,
  source_reference        text NOT NULL,
  last_validated_at       timestamptz NOT NULL,
  validated_by            text NOT NULL,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE spectral_accredited_platform_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accredited_read" ON spectral_accredited_platform_specs
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'user_role' = 'accredited_user');
```

### 3.4 `spectral_accredited_currency_implementations`

Tracks which approved currency updates from the open build have been implemented in the accredited tables.

```sql
CREATE TABLE spectral_accredited_currency_implementations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_update_id      text NOT NULL,        -- CurrencyUpdate.id from open build
  currency_update_title   text NOT NULL,        -- snapshot of title at time of implementation
  implemented_by          text NOT NULL,        -- SME who implemented
  implemented_at          timestamptz NOT NULL,
  target_table            text NOT NULL,        -- which accredited table was updated
  target_row_ids          text[] NOT NULL,      -- which row(s) were created/updated
  implementation_notes    text,
  status                  text NOT NULL DEFAULT 'active', -- active | superseded | reverted
  created_at              timestamptz NOT NULL DEFAULT now()
);
```

---

## 4. PCM Integration Architecture

### 4.1 `AccreditedDataLayer` Interface

A new interface injected into `AdjudicationContext`. When present, PCM functions use accredited data. When absent, they fall back to open-build behaviour unchanged. No open-build code is modified — the accredited layer is an optional overlay.

```typescript
// lib/pcm/accredited-data-layer.ts (new file — accredited environment only)

export interface AccreditedPlatformSpec {
  designation: string;
  speed_cruise_kt: number;
  speed_noe_kt: number;
  altitude_noe_m: number;
  radar_cross_section_m2: number;
  acoustic_signature_db: number;
  gnss_dependent: boolean;
  ew_immune: boolean;
}

export interface AccreditedDefeatEntry {
  pk_nominal: number;
  pk_ew_degraded: number;
  pk_saturation: number;
  pk_night: number;
  pk_low_confidence: number;
  min_range_km: number;
  max_range_km: number;
  is_immune_to_ew: boolean;
}

export interface AccreditedEwAsset {
  designation: string;
  pk_vs_gnss_dependent: number;
  pk_vs_rf_datalink: number;
  pk_vs_fsoc: number;
  effective_range_km: number;
  link_health_drop_pct: number;
  ew_immune_defeat: boolean;
  affects_comms_status: PCM.CommsStatus;
}

export interface AccreditedDataLayer {
  // Defeat matrix — keyed 'DefenderType|ThreatType'
  defeatMatrix: Map<string, AccreditedDefeatEntry>;

  // Platform specs — keyed by designation
  platformSpecs: Map<string, AccreditedPlatformSpec>;

  // EW assets — keyed by designation
  ewAssets: Map<string, AccreditedEwAsset>;

  // Resolve a defender-vs-threat pair. Returns null if not in accredited matrix.
  resolveDefeatPair(
    defenderType: string,
    threatType: string,
    context: { ewDegraded: boolean; saturation: boolean; night: boolean; lowConfidence: boolean }
  ): AccreditedDefeatEntry | null;
}
```

### 4.2 `AdjudicationContext` Extension

```typescript
// lib/pcm/adjudication-context.ts — ADD one optional field
export interface AdjudicationContext {
  // ... existing fields ...
  accreditedData?: AccreditedDataLayer; // undefined in open build; provided in accredited
}
```

### 4.3 `adjudicatePcmPairFromCtx()` — Accredited Override

```typescript
// lib/pcm/pcm-pair-adjudication.ts — existing function, add accredited path
export function adjudicatePcmPairFromCtx(
  ctx: AdjudicationContext,
  threat: Platform,
  defender: Platform,
  state: WorldState,
): PcmPairResult {
  // --- ACCREDITED OVERRIDE ---
  if (ctx.accreditedData) {
    const ewDegraded = state.blue_force.comms_status !== 'nominal';
    const saturation = state.red_force.platforms.filter(p =>
      ['airborne_tasked', 'airborne_loiter'].includes(p.status)
    ).length >= 8;
    const night = ['night', 'night_transition', 'pre_dawn'].includes(state.time_of_day);
    const entry = ctx.accreditedData.resolveDefeatPair(
      defender.type,
      threat.type,
      { ewDegraded, saturation, night, lowConfidence: false }
    );
    if (entry) {
      const inRange = (threat.range_km ?? 0) <= entry.max_range_km &&
                      (threat.range_km ?? 0) >= entry.min_range_km;
      return {
        combinedBlueSuccessPct: entry.pk_nominal * 100,
        inRange,
        isImmune: entry.is_immune_to_ew && defender.group === 'c_uas_defeat_ew',
      };
    }
  }
  // --- OPEN BUILD FALLBACK (unchanged) ---
  // ... existing logic ...
}
```

### 4.4 `resolveEwCombat()` — Per-Asset Effectiveness

```typescript
// lib/pcm/ew-combat-resolver.ts — accredited path in resolveEwCombat()
// Replace the fixed +0.08 coefficient:
if (ctx.accreditedData) {
  for (const ewAsset of activeRedEw) {
    const spec = ctx.accreditedData.ewAssets.get(ewAsset.type);
    if (spec) {
      const assetPenalty = spec.pk_vs_rf_datalink; // 0–1
      ewInterceptPenalty = Math.min(0.4, ewInterceptPenalty + assetPenalty);
      const linkDrop = spec.link_health_drop_pct;
      // ... apply link_health_drop_pct per asset instead of fixed 12 ...
    }
  }
} else {
  // Open build: existing fixed coefficient
  ewInterceptPenalty = Math.min(0.4, ewInterceptPenalty + activeRedEw.length * 0.08);
}
```

### 4.5 `computeThreatTti()` — Accredited Kinematics

```typescript
// lib/pcm/threat-kinematics.ts
// When accreditedData is available and platform spec exists,
// use spec.speed_cruise_kt (or speed_noe_kt after adaptRedForce NOE activation)
// instead of threat.speed_kt from the world state record.
// The world state record's speed_kt is set from the spec on exercise initialisation
// in the accredited environment so TTI calculations are accurate throughout the turn.
```

### 4.6 `WorldStateEngine` — Accredited Data Layer Load

```typescript
// lib/pcm/worldStateEngine.ts — accredited environment init
// Add to advanceTurn() before orchestrator.adjudicateTurn():
let accreditedData: AccreditedDataLayer | undefined;
if (process.env.SPECTRAL_ACCREDITED === 'true') {
  accreditedData = await loadAccreditedDataLayer(this.supabase);
}
// Pass to orchestrator.adjudicateTurn(worldState, redOrders, blueOrders, seed, dsPlayerId, ctx)
// where ctx.accreditedData = accreditedData
```

`loadAccreditedDataLayer()` fetches all three accredited tables for the platform types present in the current world state, builds the Maps, and returns the layer. Cached per-exercise to avoid repeated DB hits across turns.

---

## 5. Data Governance Model

### 5.1 Provenance Fields (Mandatory on All Accredited Records)

Every row in every accredited table carries:

| Field | Type | Purpose |
|---|---|---|
| `data_classification` | `text` | Classification marking |
| `handling_caveats` | `text[]` | e.g. `['REL AUS/NZL', 'NOFORN']` |
| `source_authority` | `text` | Authoritative source document or programme |
| `source_reference` | `text` | Specific report, page, paragraph |
| `last_validated_at` | `timestamptz` | When the value was last checked against source |
| `validated_by` | `text` | SME name / authorising position |
| `validation_notes` | `text` | Any caveats, assumptions, or applicability limits |

### 5.2 Currency Engine Handoff

The standard workflow for a new platform or capability entering the accredited environment:

```
Open Build                          Accredited Environment
──────────────────────────────      ───────────────────────────────────────
currencyEngine.proposeUpdate()  →   CurrencyUpdate (status: proposed)
SME reviews → status = approved →   listed in getPublishable()
                                    ↓
                                    Accredited SME selects updates that need
                                    controlled data and implements in:
                                    - spectral_accredited_ew_assets
                                    - spectral_accredited_defeat_matrix
                                    - spectral_accredited_platform_specs
                                    ↓
                                    Record in spectral_accredited_currency_implementations:
                                    { currency_update_id, target_table, target_row_ids }
                                    ↓
                                    Accredited DefeatMatrixCache reloads on next exercise init
```

### 5.3 Access Controls

| Role | Open Build Tables | Accredited Tables |
|---|---|---|
| `anon` | None | None |
| `authenticated` (trainee) | RLS-filtered read on exercise/scenario/sensor | None |
| `authenticated` (ds) | Full read on exercise state; write on orders | None |
| `authenticated` (accredited_user) | Same as ds | Full read on accredited tables |
| Service role | Unrestricted (server-only, never client) | Unrestricted (server-only) |

`accredited_user` is set in the user's JWT via the `user_role` claim, managed by Supabase Auth custom claims. Setting this claim requires a Supabase Edge Function called by an admin — it is not self-provisioned.

### 5.4 Controlled Data Handling Rules

1. Accredited tables are never exported via the standard SPECTRAL export pipeline. `ForceDesignReport` with `data_provenance: 'accredited_catalogue'` exports a summary only — not the underlying Pk or performance values.
2. The Claude API (`querySpectral()`) in the accredited build must never receive raw Pk values as context. Claude generates narrative; the adjudication engine computes outcomes. These concerns are separated by design.
3. `spectral_force_design_reports` in the open build always carries `data_provenance: 'open_build_placeholder'`. In the accredited build, approved reports carry `data_provenance: 'accredited_catalogue'` and are handled under the same classification as the source table.
4. No accredited table data flows into the learner model, competency records, or training plans. The learner model observes behaviour, not lethality.

---

## 6. Migration Path

### 6.1 Open Build Exercises Are Unaffected

The `SPECTRAL_ACCREDITED` environment variable is absent in the open build. `loadAccreditedDataLayer()` is never called. All PCM functions fall through to their existing open-build logic. No existing exercise, test, or API changes.

### 6.2 Accredited Deployment Sequence

1. Deploy open-build migration `20260613120003_spectral_learner_model.sql` (pending)
2. Deploy accredited-environment Supabase project (separate instance or separate schema)
3. Apply accredited migration (schema from §3 above)
4. Set `SPECTRAL_ACCREDITED=true` in accredited environment variables
5. Provision `accredited_user` role for authorised personnel
6. SME team ingests platform specs, EW asset data, and defeat matrix from approved sources
7. Each ingested row links to a `spectral_accredited_currency_implementations` record for traceability
8. Run `npm run test:spectral:all` against the accredited environment to verify PCM override paths

### 6.3 Exercise Replay for Calibration

Existing recorded exercises (`spectral_turn_records`) can be replayed against the accredited data layer using a separate `replay-calibration` script (to be authored). This allows comparison of:
- Open-build Pk proxy outcomes vs. accredited Pk outcomes for the same turn sequence
- Identifies where OSINT-proxied values are conservative or optimistic
- Produces a calibration report for SME review

---

## 7. EW Asset Catalogue — Population Process

This section describes **how** the `spectral_accredited_ew_assets` table gets populated. The source data, specific values, and individual system records are determined by the authorised SME team using approved source material. This document specifies the schema and process only.

**Population sequence for each EW asset:**

1. SME identifies system from an approved source (DSTG TR, NAVSEA, partner-nation exchange, accredited open-source compendium)
2. SME completes the row in `spectral_accredited_ew_assets` including mandatory provenance fields
3. SME validates `pk_vs_gnss_dependent`, `pk_vs_rf_datalink`, and `pk_vs_fsoc` against source — these are the three values that directly alter PCM adjudication outcomes
4. Review by a second SME; `validated_by` is updated to the reviewing authority
5. Row is linked to the originating `CurrencyUpdate.id` via `spectral_accredited_currency_implementations`
6. Open-build exercise runs against the updated accredited data layer and outcomes are reviewed for plausibility against the source scenario

**The GNSS-defeat specific workflow:**

The `pk_vs_gnss_dependent` field drives `resolveEwCombat()` for any Red EW asset targeting a Blue platform or GCS where `gnss_dependent: true` in the platform spec. This is distinct from RF datalink defeat. A system that defeats GNSS but leaves RF datalinks intact has `pk_vs_gnss_dependent > 0` and `pk_vs_rf_datalink ≈ 0`. A system that defeats RF datalinks but not GNSS has the inverse. The `buildInboundQueue()` threat TTI is unaffected by GNSS defeat — GNSS denial is a navigation degradation that affects Blue force precision, modelled as a `comms_status` penalty and a fog-of-war confidence reduction, not a platform kill.

---

## 8. Open Build Integration Test (Pre-Accredited Deployment)

Before deploying the accredited layer, run the following to confirm the open build handles `accreditedData: undefined` correctly in all PCM paths:

```bash
# All existing tests should pass unchanged
npm run test:spectral:all
npm run test:moat

# Confirm AdjudicationContext accepts accreditedData: undefined without error
# (once AccreditedDataLayer interface is added)
```

After accredited deployment:

```bash
# Set SPECTRAL_ACCREDITED=true and run against accredited Supabase instance
npm run test:spectral:all

# Verify that Pk values in test fixtures produce different outcomes
# when accredited matrix overrides the OSINT proxy.
# At minimum: one test scenario where accredited Pk > open-build proxy,
# and one where it is lower, to confirm both paths work.
```

---

## 9. Pending Actions

| # | Action | Owner | Status |
|---|---|---|---|
| 1 | Apply `20260613120003_spectral_learner_model.sql` to open-build Supabase | Engineering | Pending |
| 2 | Add `accreditedData?: AccreditedDataLayer` to `AdjudicationContext` | Engineering | Pending |
| 3 | Write `lib/pcm/accredited-data-layer.ts` interface and `loadAccreditedDataLayer()` | Engineering | Pending |
| 4 | Patch `adjudicatePcmPairFromCtx()` for accredited override path | Engineering | Pending |
| 5 | Patch `resolveEwCombat()` for per-asset effectiveness | Engineering | Pending |
| 6 | Apply accredited migration (schema from §3) to accredited Supabase instance | Engineering | Pending |
| 7 | Populate `spectral_accredited_ew_assets` from approved sources | SME team | Pending |
| 8 | Populate `spectral_accredited_platform_specs` from approved sources | SME team | Pending |
| 9 | Populate `spectral_accredited_defeat_matrix` from approved sources | SME team | Pending |
| 10 | Run calibration replay against existing exercise records | Engineering + SME | Blocked on 6–9 |
| 11 | Author `replay-calibration` script | Engineering | Pending |

---

*UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY*
