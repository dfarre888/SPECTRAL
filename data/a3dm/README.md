# A3DM RPAS shared catalog

Source of truth: `A3DM_RPAS_Database.xlsx` (Manufacturers / Drones / Payloads / Compatibility).

Both Spectral and A3DM read the generated JSON:

- `manufacturers.json`
- `drones.json`
- `payloads.json`
- `compatibility.json`

## Update workflow

1. Replace `A3DM_RPAS_Database.xlsx` with the new sheet (keep `DRN-####` / `PLD-####` / `MFR-###` IDs stable).
2. Run `npm run import:a3dm` (or `python3 scripts/import-a3dm-rpas.py path/to/file.xlsx`).
3. Commit the xlsx + regenerated JSON.
4. Apply `supabase/migrations/20260815153000_a3dm_cots_rpas.sql` if the schema is not already on the project.

Idempotent: re-import upserts on those IDs. New models get the next sequential ID from the sheet.

OSINT performance overlays (range / endurance / C2) live in `performance-osint.ts`. Per-payload bands live in `payload-bands.ts`.
