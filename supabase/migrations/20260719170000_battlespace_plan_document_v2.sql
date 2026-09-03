-- SPECTRAL Planner - BattlespacePlan document schema v2 (laydown JSONB)
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
--
-- Plan v2 extends laydown JSONB in-place (version: 2) with coalition, comms,
-- airspace, economics, readiness, and red_force sections. Existing v1 rows are
-- migrated at read time via ensurePlanDocumentV2(); no row UPDATE required.

COMMENT ON COLUMN battlespace_plans.laydown IS
  'Battlespace plan document JSONB. version 1: map geometry only (uas/cuas/radars/effectors). version 2: adds coalition, comms, airspace, economics, readiness, red_force. Legacy v1 rows migrate on read.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'battlespace_plans'
  ) THEN
    ALTER TABLE battlespace_plans
      ALTER COLUMN laydown SET DEFAULT '{
        "version": 2,
        "uas": [],
        "cuas": [],
        "radars": [],
        "effectors": [],
        "coalition": { "nations": [], "liaison_embeds": [] },
        "comms": { "interop_graph_ref": null, "pace_plans": [], "gateway_nodes": [] },
        "airspace": { "roz": [], "bullseye": null, "tanker_tracks": [] },
        "economics": { "scenarios": [], "exchange_targets": [] },
        "readiness": { "pnt_status": null, "mag_depth": null, "crew_currency_refs": [] },
        "red_force": { "platforms": [], "laydown_offset": null }
      }'::jsonb;
  END IF;
END $$;
