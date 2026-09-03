# Force Catalogue — ingestion format & boundary rules

UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY. OSINT-only.

The Force Catalogue is a global, nation-scoped OrBat that feeds the BMI interop /
PACE / spectrum engines and the SPECTRAL matrices. It reuses the BMI platform,
sensor and comms shapes (`lib/bmi/bmi-types.ts`) so the existing engines run on
catalogue data unchanged. Catalogue rows live in `bmi_exercise_platforms` with
`is_catalog = true` and `exercise_id = NULL`.

## Files
- `index.ts` — aggregates every nation file, exports `FORCE_CATALOG`, `CATALOG_NATIONS`.
- One file per nation: `australia.ts`, `usa.ts`, `china.ts`, … each default-exports
  `ForceCatalogPlatformFull[]`.
- Migrations under `supabase/migrations/*_force_catalog_*.sql` carry the SQL seed.

## The quality bar (non-negotiable — this is a defence tool)
1. **Every platform is sourced.** `sources[]` names a real public reference
   (Jane's summary, Wikipedia current-inventory list, manufacturer page, defence
   press). No source ⇒ do not add the row.
2. **Confidence-tag honestly.** `high` = multiple current OSINT sources agree;
   `medium` = single reputable source; `estimated` = inferred / projected;
   `classified` = never seeded here (placeholder only).
3. **OSINT-descriptive only for sensors/comms.** Band, antenna type, datalink
   standard, role, can/cannot-detect *categories*. That is all.
4. **Performance pins to the boundary.** Detection ranges, EW effectiveness,
   ECCM, weapons envelopes, true speed/range → NEVER stored. Set
   `performance_ref: 'SOVEREIGN_CORE_BOUNDARY'` on the sensor and resolve in the
   defence IDE. No range numbers in this repo.
5. **No crypto material.** `comsec_note` is descriptive only
   ("requires common crypto keying"), never key/net/fill data.

## Tranche discipline
The catalogue is built nation-by-nation over multiple sessions. Each nation is
researched, seeded, and reviewed before the next. `australia.ts` is tranche 1 and
sets the depth standard: air + land + maritime + at least the headline future
programs, comms/sensors on the highest-value platforms.

## Combat-proven summary convention (conflict-derived rows)
Lead the `open_source_summary` with a searchable clause, e.g.
`combat-proven: Ukraine 2022–26. …` or `combat-proven: Red Sea 2023–26. …`
so Force Catalogue search / future filters can find battle-tested capability without a new column.

## Non-state / conflict classes
- Bloc `Non-state` for proxy actors (HOU, HEZ, HMS, WAG, ISI).
- Synthetic nation `XCC` (“Conflict Capability Classes”) holds cross-cutting capability rows
  (fibre-optic FPV, OWA saturation, interceptor economics, etc.).
- Prefer `platform_library_id` links into `data/seed-platforms.ts` over duplicating dossiers.

## Roadmap (build order)
Blue: AUS → USA → UK → Japan → Korea → France → Germany → Canada/NZ → rest of NATO.
Red: China → Russia → North Korea → Iran / non-state.
Each Red nation is `force_side: 'red'`, bloc `CRINK` (state) or `Non-state` (proxy).
