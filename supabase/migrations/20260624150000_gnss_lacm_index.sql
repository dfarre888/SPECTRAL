-- SPECTRAL — GNSS unique index (corrective governance migration)
--
-- The unique constraint on gnss_platform_dependencies(platform_id, constellation)
-- was incorrectly added to 20260624120000_iran_missile_systems.sql, an already-applied
-- migration. This file formalises that change with IF NOT EXISTS guards so it applies
-- cleanly regardless of whether the index was already created by the modified file.
--
-- Governance rule: never modify applied migrations — always create a new file.

CREATE UNIQUE INDEX IF NOT EXISTS gnss_deps_platform_constellation_unique
  ON gnss_platform_dependencies (platform_id, constellation);
