-- Platform Library: ADF small UAS, Innovaero OWL-B, DPRK Kumsong attack drones,
-- and corrections to existing ADF-relevant rows (Sep 2026 credibility pass).
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY. OSINT only.
-- Known published specs only; everything else NULL. Where sources disagree the
-- conservative or maker figure is used and the sources line says so.
-- Idempotent: inserts use ON CONFLICT (id) DO NOTHING; corrections are plain UPDATEs.

INSERT INTO platforms
  (id, name, manufacturer, country_of_origin, category, side, max_speed_kmh, endurance_hrs, range_km,
   mtow_kg, warhead_kg, wingspan_m, ioc_year, uas_group, propulsion, engine_type, data_link_mhz,
   control_link_freq, gnss_used, nav_backup, sensor_suite, weapon_types, known_operators,
   sub_category, sources, data_confidence, intel_update_date)
VALUES
  ('teledyne-flir-black-hornet-3', 'Teledyne FLIR Black Hornet 3', 'Teledyne FLIR (Prox Dynamics)', 'Norway',
   'VTOL', 'blue', 21.5, 0.42, 2, 0.033, NULL, NULL, NULL, 1, NULL, NULL, NULL,
   'AES-256 encrypted link (bands not published)', '{}', ARRAY['GNSS-denied navigation (maker)'], '{}', '{}',
   ARRAY['Australian Army'], 'Nano rotary ISR',
   ARRAY[
     'Army Technology (33 g, about 21.5 km/h, 25 min, 2 km): https://www.army-technology.com/projects/black-hornet-personal-reconnaissance-system/',
     'Military Embedded Systems, Oct 2017 (A$6.8m Australian Army order): https://militaryembedded.com/unmanned/isr/australian-army-signs-6-8-million-contract-for-nano-sized-drones',
     'Defense News, 19 Sep 2024 (Army uses Black Hornet 3): https://www.defensenews.com/global/asia-pacific/2024/09/19/australian-army-to-grow-diversify-its-drone-fleet/'
   ], 'medium', '2026-09-24'),

  ('sypaq-corvo-x', 'SYPAQ Corvo X', 'SYPAQ Systems', 'Australia',
   'VTOL', 'blue', 100, 0.67, 5, NULL, NULL, 0.82, 2026, 1, NULL, NULL, NULL,
   'IP mesh encrypted datalink (bands not published)', '{}', '{}', '{}', '{}',
   ARRAY['Australian Army'], 'Fixed-wing VTOL ISR',
   ARRAY[
     'SYPAQ brochure, Aug 2023 (hover to 100 km/h, 5 km, sub 2 kg, 820 mm span, 50 min): https://corvouas.com.au/wp-content/uploads/CORVO-X-GUARDA-70-web-version-23082023-compressed_1.pdf',
     'PS News, Mar 2026 (Army: 40 min, 5 km; endurance field uses the Army figure): https://psnews.com.au/army-artillery-troops-begin-introduction-of-new-small-uncrewed-aerial-systems/174702/',
     'Australian Defence Magazine, May 2026 (entry into service, DEF129 Phase 4B): https://www.australiandefence.com.au/defence/land/sypaq-systems-corvo-x-enters-into-service'
   ], 'medium', '2026-09-24'),

  ('teledyne-flir-skyranger-r70', 'Teledyne FLIR SkyRanger R70', 'Teledyne FLIR (Aeryon Labs)', 'Canada',
   'VTOL', 'blue', 50, 0.67, 8, NULL, NULL, NULL, NULL, 1, NULL, NULL, ARRAY[915, 922, 2200, 2488]::numeric[],
   '915 MHz, 922 MHz, 2.2 GHz and 2.488 GHz plus others, AES-256 (maker datasheet)', '{}', '{}', '{}', '{}',
   ARRAY['RAAF No. 3 Security Forces Squadron'], 'Quadcopter ISR',
   ARRAY[
     'Teledyne FLIR SkyRanger R70 datasheet (50 km/h, 40+ min, 8 km radio range, link bands): https://farrwest.com/wp-content/uploads/2024/05/SkyRangerR70DataSheet.pdf',
     'Defence news, 17 Nov 2020 (3SECFOR use): https://www.defence.gov.au/news-events/news/2020-11-17/sky-ranger-innovation-target'
   ], 'medium', '2026-09-24'),

  ('innovaero-owl-b', 'Innovaero OWL-B', 'Innovaero', 'Australia',
   'loitering_munition', 'blue', NULL, NULL, 100, 30, 7, NULL, NULL, 3, 'electric', 'electric', NULL,
   NULL, '{}', '{}', '{}', ARRAY['Anti-armour or fragmentation warhead, up to 7 kg (maker)'],
   '{}', 'Electric loitering munition, in development (target service 2027)',
   ARRAY[
     'Janes, Nov 2025 (about 100 km with a 20 kt headwind, about 30 min loiter; range field uses this): https://www.janes.com/osint-insights/defence-news/sea/indo-pacific-2025-australia-conducts-maritime-trials-of-owl-b-loitering-munition',
     'Australian Defence Magazine (30 kg MTOW, warhead up to 7 kg): https://www.australiandefence.com.au/defence/air/innovaero-develops-next-gen-loitering-munition',
     'ASCA post, Oct 2025 (A$20.8m Mission Talon-Strike contract): https://www.linkedin.com/posts/asca-aus_ascaaus-youadf-innovation-activity-7384099733864267776-J6kz'
   ], 'medium', '2026-09-24'),

  ('dprk-kumsong-attack-drones', 'Kumsong (Geumseong) series attack drones', 'Not published (tested by the DPRK Academy of Defence Science)', 'North Korea',
   'loitering_munition', 'red', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, '{}', '{}', '{}', '{}',
   ARRAY['Korean People''s Army'], 'Reported types: Harop-like delta wing and Lancet-like X-wing; no published specs',
   ARRAY[
     'RFA, 25 Aug 2024 (Kim watches tests; two types shown): https://www.rfa.org/english/news/korea/north-korea-suicide-drone-08252024233638.html',
     'Al Jazeera, 15 Nov 2024 (Kim orders mass production): https://www.aljazeera.com/news/2024/11/15/north-koreas-kim-orders-mass-production-of-attack-drones-state-media',
     'ABC News, 27 Mar 2025 (KCNA: AI-equipped suicide drones): https://www.abc.net.au/news/2025-03-27/north-korean-military-tests-ai-suicide-drones/105102750',
     'Korea Herald, Sep 2025 (KCNA first uses the name Kumsong-series): https://www.koreaherald.com/article/10578996'
   ], 'estimated', '2026-09-24')
ON CONFLICT (id) DO NOTHING;

-- PLA Jiu Tian already exists as 'avic-nine-sky' (Nine Sky is the translation).
-- Replace unsourced figures with AVIC-claimed figures as reported; clear the
-- 500 kg warhead and GPS/RF-command values, which had no source.
UPDATE platforms SET
  name = 'AVIC Jiu Tian (Nine Sky) SS-UAV drone mothership',
  category = 'carrier_uas',
  side = 'red',
  max_speed_kmh = 700,
  service_ceiling_m = 15000,
  range_km = 7000,
  endurance_hrs = 12,
  mtow_kg = 16000,
  max_payload_kg = 6000,
  warhead_kg = NULL,
  wingspan_m = 25,
  length_m = 16.35,
  gnss_used = '{}',
  guidance_type = NULL,
  known_operators = '{}',
  sub_category = 'Drone mothership; first flight 11 Dec 2025; not in service',
  sources = ARRAY[
    'TWZ (AVIC claims: 16 t MTOW, 6 t payload, 12 h, about 7,000 km, about 700 km/h, 15,000 m; first flight 11 Dec 2025): https://www.twz.com/air/chinas-high-flying-swarm-mothership-drone-has-flown',
    'GlobalSecurity SS-UAV page: https://www.globalsecurity.org/military/world/china/ss-uav.htm'
  ],
  data_confidence = 'estimated',
  intel_update_date = '2026-09-24',
  updated_at = now()
WHERE id = 'avic-nine-sky';

-- Insitu Integrator: replace the generic COTS map envelope (5 km, 0.33 h, 500 m,
-- electric) with the maker product card. Australian Army LAND 129 Phase 3.
UPDATE platforms SET
  max_speed_kmh = 167,
  endurance_hrs = 24,
  range_km = 93,
  service_ceiling_m = NULL,
  engine_type = NULL,
  propulsion = NULL,
  side = 'blue',
  control_link_freq = 'Encrypted C2 link (bands not published)',
  defeat_note = 'Group 3 tactical UAS with an encrypted C2 link; link bands not published.',
  known_operators = ARRAY['Australian Army (20th Regiment RAA)'],
  sources = ARRAY[
    'Insitu Integrator product card, 2020 (90+ kt, 24+ h, 50+ nm line-of-sight radius, 74.8 kg MTOW, 18 kg payload): https://www.insitu.com/wp-content/uploads/2020/12/Integrator_ProductCard_DU120320.pdf',
    'Defence project page (LAND 129 Phase 3, replaces RQ-7B Shadow): https://www.defence.gov.au/defence-activities/projects/tactical-uncrewed-aerial-system',
    'A3DM RPAS Database (shared catalog)'
  ],
  data_confidence = 'medium',
  intel_update_date = '2026-09-24',
  updated_at = now()
WHERE id = 'insitu-integrator-isr';

-- Quantum Systems Vector AI: replace the generic COTS map envelope with the
-- maker datasheet. The Australian Army operates Vector AI (Janes, Jul 2026).
UPDATE platforms SET
  max_speed_kmh = 72,
  endurance_hrs = 3,
  range_km = 40,
  service_ceiling_m = NULL,
  side = 'blue',
  control_link_freq = '2.2-2.5 GHz and 4.4-4.9 GHz, AES-256 (maker datasheet)',
  defeat_note = 'Encrypted datalink on 2.2-2.5 GHz and 4.4-4.9 GHz with 40+ km datalink range (maker). Range field is datalink range; Army quotes 15 km operational range.',
  known_operators = ARRAY['Australian Army'],
  sources = ARRAY[
    'Quantum Systems Vector AI datasheet, Sep 2025 (9.5 kg MTOW, 180+ min, 15-20 m/s, 40+ km datalink): https://quantum-systems.com/us/wp-content/uploads/sites/4/2025/09/QS_US_Vector_AI_Datasheet_250910_website.pdf',
    'Quantum Systems release, Apr 2024 (A$90m DEF129 contracts): https://www.prnewswire.com/news-releases/quantum-systems-inc-awarded-two-contracts-by-commonwealth-of-australia-for-def129-suas-totaling-aud-90-million-302196166.html',
    'Janes, 9 Jul 2026 (Army fields Vector AI): https://www.janes.com/defence-intelligence-insights/defence-news/defence/australia-fields-vector-ai-surveillance-uav',
    'A3DM RPAS Database (shared catalog)'
  ],
  data_confidence = 'medium',
  intel_update_date = '2026-09-24',
  updated_at = now()
WHERE id = 'quantum-vector-ai-isr-rsta';

-- Switchblade 300: record the Australian purchase (announced 8 Jul 2024, FMS).
UPDATE platforms SET
  known_operators = array_append(known_operators, 'Australian Army (ordered Jul 2024)'),
  sources = array_append(sources, 'Defence Ministers release, 8 Jul 2024: https://www.minister.defence.gov.au/media-releases/2024-07-08/australian-government-announces-acquisition-precision-loitering-munition'),
  updated_at = now()
WHERE id = 'switchblade-300'
  AND NOT ('Australian Army (ordered Jul 2024)' = ANY (coalesce(known_operators, '{}')));
