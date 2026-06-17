-- Conflict Intel UI — extend existing conflict_incidents with geo/timeline fields

ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS conflict_name TEXT;
ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS incident_title TEXT;
ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS incident_type TEXT;
ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;
ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;
ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS source_ref TEXT;
ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS platforms_involved TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS confidence TEXT;
ALTER TABLE conflict_incidents ADD COLUMN IF NOT EXISTS classification TEXT NOT NULL DEFAULT 'UNCLASSIFIED';

UPDATE conflict_incidents
SET
  incident_title = COALESCE(incident_title, LEFT(COALESCE(tactical_notes, id), 120)),
  summary = COALESCE(summary, tactical_notes),
  source_ref = COALESCE(source_ref, NULLIF(array_to_string(sources, '; '), '')),
  confidence = COALESCE(confidence, data_confidence),
  platforms_involved = CASE
    WHEN platforms_involved IS NULL OR platforms_involved = '{}' THEN
      CASE WHEN platform_used IS NOT NULL THEN ARRAY[platform_used] ELSE '{}' END
    ELSE platforms_involved
  END,
  conflict_name = COALESCE(conflict_name, conflict)
WHERE incident_title IS NULL OR summary IS NULL OR conflict_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_conflict_incidents_occurred
  ON conflict_incidents(occurred_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conflict_incidents_type
  ON conflict_incidents(incident_type);

INSERT INTO conflict_incidents
  (id, conflict, conflict_name, incident_title, incident_type, occurred_at, lat, lon, summary, source_ref, platforms_involved, confidence, tactical_notes, data_confidence)
VALUES
  ('CI-UKR-001', 'Ukraine', 'Ukraine', 'Shahed saturation strike on Kyiv', 'swarm', '2024-12-31T02:00:00Z', 50.4501, 30.5234,
   'Large mixed Shahed/Geran package stressed layered C-UAS and magazine depth.', 'OSINT Ukraine air defence reporting Dec 2024',
   ARRAY['shahed-136'], 'Confirmed', 'Shahed saturation strike on Kyiv', 'high'),
  ('CI-UKR-002', 'Ukraine', 'Ukraine', 'Fibre-optic FPV corridor assault', 'uas_strike', '2025-03-15T08:30:00Z', 48.5132, 37.7750,
   'EW-immune FPV lanes exploited RF jamming gaps in close terrain.', 'OSINT Donetsk axis reporting Mar 2025',
   ARRAY['fpv-fibre-optic'], 'Assessed', 'Fibre-optic FPV corridor assault', 'high'),
  ('CI-UKR-003', 'Ukraine', 'Ukraine', 'GNSS denial ahead of OWA salvo', 'gnss_denial', '2025-06-01T21:00:00Z', 49.9935, 36.2304,
   'Localized L-band interference preceded OWA transit — navigation degradation observed.', 'OSINT Kharkiv EW reporting Jun 2025',
   ARRAY['shahed-136'], 'Reported', 'GNSS denial ahead of OWA salvo', 'medium'),
  ('CI-RED-001', 'Red Sea', 'Red Sea', 'Houthi OWA-UAV vs commercial shipping', 'naval', '2024-11-18T14:00:00Z', 13.5, 42.9,
   'One-way attack UAV struck merchant hull; CIWS engagement window compressed.', 'OSINT Red Sea incident tracking Nov 2024',
   ARRAY['shahed-136'], 'Confirmed', 'Houthi OWA-UAV vs commercial shipping', 'high'),
  ('CI-RED-002', 'Red Sea', 'Red Sea', 'USV swarm probe of warship screen', 'naval', '2025-01-22T06:00:00Z', 14.2, 42.8,
   'Coordinated USV approach forced escort manoeuvre and ISR re-tasking.', 'OSINT CENTCOM / maritime OSINT Jan 2025',
   ARRAY['magura-v5'], 'Assessed', 'USV swarm probe of warship screen', 'medium'),
  ('CI-NK-001', 'Nagorno-Karabakh', 'Nagorno-Karabakh', 'TB2 ISR-enabled strike chain', 'isr', '2020-10-19T12:00:00Z', 39.8, 46.75,
   'MALE ISR cued precision fires — classic find-fix-finish against armour.', 'OSINT NK 2020 open-source ORBAT',
   ARRAY['bayraktar-tb2'], 'Confirmed', 'TB2 ISR-enabled strike chain', 'high')
ON CONFLICT (id) DO UPDATE SET
  conflict_name = EXCLUDED.conflict_name,
  incident_title = EXCLUDED.incident_title,
  incident_type = EXCLUDED.incident_type,
  occurred_at = EXCLUDED.occurred_at,
  lat = EXCLUDED.lat,
  lon = EXCLUDED.lon,
  summary = EXCLUDED.summary,
  source_ref = EXCLUDED.source_ref,
  platforms_involved = EXCLUDED.platforms_involved,
  confidence = EXCLUDED.confidence;
