-- SPECTRAL GNSS Intelligence — expand constellation catalogue
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
-- Adds NavIC, QZSS, SBAS augmentation, and Starlink LEO PNT/comms visibility

ALTER TABLE gnss_constellations
  ADD COLUMN IF NOT EXISTS system_category TEXT
    CHECK (system_category IN ('global_gnss','regional_gnss','augmentation','leo_pnt_comms'));

-- Tag existing global constellations
UPDATE gnss_constellations SET system_category = 'global_gnss'
WHERE id IN ('gps','glonass','beidou','galileo') AND system_category IS NULL;

-- QZSS — Japan regional GPS augmentation (Michibiki)
INSERT INTO gnss_constellations (
  id, full_name, display_name, operator, operator_country, status, signal_bands,
  satellites_nominal, satellites_active, constellation_size, system_category, notes, updated_at
) VALUES (
  'qzss', 'QZSS (Michibiki)', 'QZSS (Michibiki)', 'JAXA', 'Japan', 'operational',
  '[{"band":"L1","freq_mhz":1575.42},{"band":"L6 LEX","freq_mhz":1278.75}]'::jsonb,
  4, 4, 4, 'regional_gnss',
  'Assessed: Regional GNSS augmentation overlay — L1 C/A compatible with GPS; L6 LEX for disaster alerting and centimetre-level augmentation in Japan/Oceania service area. Not a standalone global constellation. Source: JAXA QZSS programme documentation.',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  operator = EXCLUDED.operator,
  operator_country = EXCLUDED.operator_country,
  status = EXCLUDED.status,
  signal_bands = EXCLUDED.signal_bands,
  satellites_nominal = EXCLUDED.satellites_nominal,
  satellites_active = EXCLUDED.satellites_active,
  system_category = EXCLUDED.system_category,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- NavIC — India regional GNSS (IRNSS)
INSERT INTO gnss_constellations (
  id, full_name, display_name, operator, operator_country, status, signal_bands,
  satellites_nominal, satellites_active, constellation_size, system_category, notes, updated_at
) VALUES (
  'navic', 'NavIC (IRNSS)', 'NavIC (IRNSS)', 'ISRO', 'India', 'operational',
  '[{"band":"L5","freq_mhz":1176.45},{"band":"S","freq_mhz":2492.028}]'::jsonb,
  7, 7, 7, 'regional_gnss',
  'Confirmed: Indian Regional Navigation Satellite System — L5 (1176 MHz) and S-band (2492 MHz). ~1500 km coverage over Indian subcontinent and extended service area. Dual-band receivers (e.g. Nagastra-1) require simultaneous L-band + S-band denial for mission kill. Source: ISRO NavIC service documentation.',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  operator = EXCLUDED.operator,
  status = EXCLUDED.status,
  signal_bands = EXCLUDED.signal_bands,
  satellites_nominal = EXCLUDED.satellites_nominal,
  satellites_active = EXCLUDED.satellites_active,
  system_category = EXCLUDED.system_category,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- SBAS — WAAS / EGNOS / MSAS / GAGAN augmentation systems
INSERT INTO gnss_constellations (
  id, full_name, display_name, operator, operator_country, status, signal_bands,
  satellites_nominal, satellites_active, constellation_size, system_category, notes, updated_at
) VALUES (
  'sbas', 'SBAS', 'SBAS (WAAS / EGNOS / MSAS / GAGAN)', 'Multi', 'Multi-nation', 'operational',
  '[{"band":"L1 augmentation","freq_mhz":1575.42}]'::jsonb,
  40, 38, 40, 'augmentation',
  'Confirmed: Satellite-Based Augmentation Systems — WAAS (US FAA), EGNOS (EU), MSAS (Japan), GAGAN (India). Transmit differential corrections on GPS L1 frequency via GEO satellites. Augmentation layer — not independent PNT. L1 broadband jamming defeats both GPS and SBAS simultaneously.',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  operator = EXCLUDED.operator,
  status = EXCLUDED.status,
  signal_bands = EXCLUDED.signal_bands,
  satellites_nominal = EXCLUDED.satellites_nominal,
  satellites_active = EXCLUDED.satellites_active,
  system_category = EXCLUDED.system_category,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Starlink — LEO PNT / comms (NOT traditional GNSS)
INSERT INTO gnss_constellations (
  id, full_name, display_name, operator, operator_country, status, signal_bands,
  satellites_nominal, satellites_active, constellation_size, system_category, notes, updated_at
) VALUES (
  'starlink', 'Starlink', 'Starlink (LEO PNT / Comms)', 'SpaceX', 'United States', 'operational',
  '[{"band":"Ku downlink","freq_mhz":12000},{"band":"Ka downlink","freq_mhz":19000},{"band":"Ku uplink","freq_mhz":14250}]'::jsonb,
  12000, 6400, 6400, 'leo_pnt_comms',
  'Assessed: LEO broadband SATCOM constellation — NOT a traditional GNSS constellation. Ku (10.7–12.75 GHz) and Ka (17.8–19.3 GHz) bands for user-terminal C2 and data relay. Estimated ~6,400+ operational satellites (2025). Reported BLOS datalink employment for UAS in Ukraine and maritime contexts. Experimental PNT augmentation trials reported — no confirmed operational ARNS-protected navigation service. Treat as comms pathway dependency.',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  operator = EXCLUDED.operator,
  status = EXCLUDED.status,
  signal_bands = EXCLUDED.signal_bands,
  satellites_nominal = EXCLUDED.satellites_nominal,
  satellites_active = EXCLUDED.satellites_active,
  system_category = EXCLUDED.system_category,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Platform dependencies — Starlink BLOS comms (secondary; not GNSS positioning)
INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes, data_source)
SELECT 'mq-9-reaper', 'starlink', 'secondary', 'degraded',
  'Assessed: BLOS SATCOM pathway — Starlink reported in some coalition UAS architectures as Ku/Ka relay alternative',
  'osint'
WHERE NOT EXISTS (
  SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'mq-9-reaper' AND constellation = 'starlink'
);

INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes, data_source)
SELECT 'tb2-bayraktar', 'starlink', 'secondary', 'degraded',
  'Reported: Ukraine theatre SATCOM relay architectures — Starlink mesh for BLOS C2 in some units',
  'osint'
WHERE NOT EXISTS (
  SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'tb2-bayraktar' AND constellation = 'starlink'
);

INSERT INTO gnss_platform_dependencies (platform_id, constellation, dependency_level, jamming_effect, notes, data_source)
SELECT 'fpv-rc', 'starlink', 'secondary', 'minimal',
  'Reported: Ukraine FPV relay nodes using Starlink for beyond-LOS coordination — not universal to all FPV',
  'osint'
WHERE NOT EXISTS (
  SELECT 1 FROM gnss_platform_dependencies WHERE platform_id = 'fpv-rc' AND constellation = 'starlink'
);
