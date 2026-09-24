-- ADF counter-drone systems (LAND 156, ASCA Mission Syracuse, Ex Austral Shield).
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY. OSINT only.
-- Specs are maker-published figures only, labelled "maker" in conflict_notes.
-- Anything not published is NULL. No pair-specific Pk is added: new effectors use
-- the matrix default path. The table has no operator/program/status columns, so
-- ADF operator, program and status are stated in conflict_notes.
-- Detect-only sensors carry defeat_method {detect}, matching existing sensor rows.
-- Not added: Acacia Systems Cortex (C2 software with no own sensor or effector;
-- as a matrix column it would inherit a generic COTS Pk). It is recorded in the
-- LAND 156 Force Catalogue entry instead.
-- Idempotent: inserts use ON CONFLICT (id) DO NOTHING; the Slinger update is a
-- plain UPDATE of the existing row.

INSERT INTO anti_drone_systems
  (id, name, manufacturer, country, defeat_method, frequency_bands_covered, effective_range_m,
   power_output_w, weight_kg, portability, price_usd_approx, platforms_can_defeat,
   conflict_validated, conflict_notes, sources, data_confidence)
VALUES
  ('d13-dart', 'Department 13 DART (RF detect and protocol defeat)', 'Department 13', 'Australia',
   '{detect,cyber}', '{}'::jsonb, 2000, NULL, 34, 'vehicle', NULL, '{}', false,
   'Passive 360 degree RF detection. Defeat is by protocol manipulation (fend-off or forced landing), not jamming. Maker: up to 5,000 m rural and 2,000 m urban (range field uses the urban figure); 34 kg; fits utility, PMV and armoured vehicles or a mast. Bands published only as "wide band". ADF: Department 13 is the RF partner on the Leidos LAND 156 team; DART was part of the first LAND 156 live fire at Exercise Southern Arrow 25 (Cultana, Dec 2025). Contract value not published.',
   ARRAY[
     'Department 13 DART brochure, 2025: https://department13.com/wp-content/uploads/2025/10/D13-DART-Brochure-2025.pdf',
     'Defence news, 24 Dec 2025: https://www.defence.gov.au/news-events/news/2025-12-24/army-tests-counter-drone-technology'
   ], 'medium'),

  ('echodyne-echoguard', 'Echodyne EchoGuard (K-band counter-drone radar)', 'Echodyne', 'United States',
   '{detect}', '{"radar_k_band_us_mhz": "24450-24650", "radar_k_band_intl_mhz": "24050-24250"}'::jsonb,
   1000, NULL, 1.25, 'vehicle', NULL, '{}', false,
   'Metamaterial ESA radar, detect and track only. Maker: 120 x 80 degree field of view, 6 km instrumented range, more than 1,000 m against a DJI Phantom 4 and more than 1,400 m against a Matrice 600 (range field uses the Phantom 4 figure); 1.25 kg, 50 W. Also fitted to the EOS Slinger. ADF: Echodyne is the radar provider on the Leidos LAND 156 team (Sep 2025); EchoGuard was part of the Exercise Southern Arrow 25 live fire (Dec 2025).',
   ARRAY[
     'Echodyne EchoGuard datasheet 25JA1: https://www.radartutorial.eu/19.kartei/05.perimeter/pubs/ts-echoguard-echodyne_25ja1.pdf',
     'C-UAS Hub, Sep 2025: https://cuashub.com/en/content/echodyne-chosen-as-radar-supplier-for-adfs-c-uas-initiative-project-land-156/',
     'Defence news, 24 Dec 2025: https://www.defence.gov.au/news-events/news/2025-12-24/army-tests-counter-drone-technology'
   ], 'medium'),

  ('dronebuster', 'DZYNE / Ondas Dronebuster DTIM kit (handheld)', 'DZYNE Technologies (Ondas)', 'United States',
   '{RF_jamming}', '{"rf_detect_mhz": "400-6000"}'::jsonb, NULL, NULL, 2.65, 'man-portable', NULL, '{}', false,
   'Handheld and wearable kit: DTI detector plus Dronebuster DB4 or DB5 defeat unit. Detects 400 MHz to 6 GHz in all directions (maker; Defence Connect). Defeat is RF jamming plus GNSS/PNT disruption; GNSS spoofing is optional. Jamming bands not published ("restricted"). Maker detection claim: more than 7 km at shoulder height. DB4 about 2.65 kg with battery. ADF: DZYNE and HIFraser LAND 156 Phase 1 contract (Sep 2025); Ondas announced a further $6.9m order on 20 Jul 2026 (company claim, currency not stated). Used at Exercise Austral Shield 2026 (Weipa, Jul 2026).',
   ARRAY[
     'DZYNE release, Sep 2025: https://dzyne.com/dzyne-and-hifraser-awarded-multi-million-dollar-contract-to-deliver-dronebuster-dtim-kits-for-australias-land-156-program/',
     'Ondas release, 20 Jul 2026: https://ir.ondas.com/press-releases/detail/316/ondas-secures-6-9m-australian-defence-order-expanding',
     'Defence Connect, Jul 2026: https://www.defenceconnect.com.au/land/18651-adf-personnel-fight-aerial-threats-with-dronebuster-c-uas-during-exercise-austral-shield',
     'DZYNE DB4 page: https://dzyne.com/db4/'
   ], 'medium'),

  ('keyoptions-sky-control', 'KeyOptions SkyControl (counter-drone package)', 'KeyOptions', 'Multi',
   '{detect,RF_jamming,spoofing}', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, '{}', false,
   'Software and hardware package: passive RF detection and direction finding (Skycope sensors), AI camera, radar, RF jamming and RF takeover (maker). Fixed, vehicle or person-mounted. Bands and defeat range not published; maker claims detection to 35 km. ADF: KeyOptions was one of 11 LAND 156 first-wave vendors (Jul 2025, value not disclosed); SkyControl was used at Exercise Austral Shield 2026.',
   ARRAY[
     'KeyOptions product page: https://www.keyoptions.com/counter-drone-systems',
     'Australian Defence Magazine, Aug 2025: https://www.australiandefence.com.au/news/news/keyoptions-secures-counter-uav-contract',
     'CONTACT (Defence story), 8 Aug 2026: https://contactairlandandsea.com/2026/08/08/counter-drone-tech-tested-on-aussie-exercise/'
   ], 'medium'),

  ('droneshield-rfpatrol-mk2', 'DroneShield RfPatrol Mk2 (wearable passive RF detector)', 'DroneShield', 'Australia',
   '{detect}', '{}'::jsonb, NULL, NULL, 1.2, 'man-portable', NULL, '{}', false,
   'Wearable passive RF detector: 360 degree, no emissions, 1.2 kg with battery, up to 8 hours (maker). Bands and range not published by the maker. ADF: part of DroneShield''s $5m share of the $16.9m LAND 156 first wave (Jul 2025); Mk2 used at Exercise Austral Shield 2026.',
   ARRAY[
     'DroneShield dismounted products: https://www.droneshield.com/products-dismounted',
     'Australian Defence Magazine, Jul 2025: https://www.australiandefence.com.au/defence/land/popular-ukrainian-drone-detector-amongst-land-156-winners',
     'CONTACT (Defence story), 8 Aug 2026: https://contactairlandandsea.com/2026/08/08/counter-drone-tech-tested-on-aussie-exercise/'
   ], 'medium'),

  ('droneshield-dronegun-mk4', 'DroneShield DroneGun Mk4 (handheld RF and GNSS jammer)', 'DroneShield', 'Australia',
   '{RF_jamming}', '{}'::jsonb, NULL, NULL, 3.37, 'man-portable', NULL, '{}', false,
   'Handheld jammer covering ISM bands and GNSS (maker; exact MHz not published). 3.37 kg with battery, more than 1 hour of jamming (maker). Range not published. ADF: DroneShield received $5m of the $16.9m LAND 156 first wave and supplied DroneGun Mk4 and RfPatrol (Jul 2025).',
   ARRAY[
     'DroneShield dismounted products: https://www.droneshield.com/products-dismounted',
     'DroneShield release, Jul 2025: https://www.droneshield.com/media/press-releases/land-156-initial-contracts-announcement',
     'Australian Defence Magazine, Jul 2025: https://www.australiandefence.com.au/defence/land/popular-ukrainian-drone-detector-amongst-land-156-winners'
   ], 'medium'),

  ('droneshield-dronesentry-x-mk2', 'DroneShield DroneSentry-X Mk2 (on-the-move detect and defeat)', 'DroneShield', 'Australia',
   '{detect,RF_jamming}', '{}'::jsonb, NULL, NULL, 46, 'vehicle', NULL, '{}', false,
   'Vehicle or fixed-site system with hemispheric RF detection and ISM-band disruption (maker). Device 46 kg. Bands and range not published. Released Oct 2023. No ADF or LAND 156 purchase found in open sources.',
   ARRAY[
     'DroneShield on-the-move products: https://www.droneshield.com/products-on-the-move',
     'DroneShield release, Oct 2023: https://www.droneshield.com/media/press-releases/droneshield-releases-dronesentry-x-mk2nbspfor-multi-mission-counter-uas-applications-2pt3w'
   ], 'medium'),

  ('steelrock-nightfighter', 'Steelrock NightFighter (man-portable RF jammer family)', 'Steelrock Technologies', 'United Kingdom',
   '{RF_jamming}', '{}'::jsonb, NULL, NULL, NULL, 'man-portable', NULL, '{}', false,
   'Family of man-portable RF jammers (S, X, Mini, Foxtrot and others). Only the Foxtrot band is published (20 MHz to 6 GHz); range and weight not published. ADF: Steelrock received the largest LAND 156 first-wave award, $5.7m (reported by InnovationAus via ADM, Jul 2025). Which Steelrock product was bought is not confirmed.',
   ARRAY[
     'Steelrock Technologies site: https://www.sruav.co.uk/',
     'Australian Defence Magazine, Jul 2025: https://australiandefence.com.au/news/news/global-drone-attacks-put-land-156-in-the-spotlight'
   ], 'estimated'),

  ('silentium-maverick-m8', 'Silentium Defence MAVERICK M8 (passive radar)', 'Silentium Defence', 'Australia',
   '{detect}', '{}'::jsonb, 5000, NULL, 29, 'man-portable', NULL, '{}', false,
   'Passive radar, so it does not transmit. UHF band (maker; MHz not published). Maker: small drones detected to 5,000 m; 29 kg complete with every component under 6 kg; 72 W; backpack to operating in under 10 minutes. ADF: selected for LAND 156 (Jan 2026); contract value not disclosed.',
   ARRAY[
     'Silentium MAVERICK M8 brochure: https://www.silentiumdefence.com.au/wp-content/uploads/2023/09/Silentium-Defence-MAVERICK-M8-Technical-Brochure.pdf',
     'Australian Defence Magazine, Jan 2026: https://www.australiandefence.com.au/news/news/silentium-passive-radar-selected-for-land-156'
   ], 'medium'),

  ('dedrone-tracker-ai', 'Dedrone by Axon DedroneTracker.AI (detection and C2)', 'Dedrone (Axon)', 'United States',
   '{detect}', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, '{}', false,
   'Sensor-fusion and C2 software for drone detection, tracking and identification. Axon completed its acquisition of Dedrone on 2 Oct 2024. ADF: Axon Public Safety Australia was a LAND 156 first-wave vendor (Jul 2025); Dedrone says DedronePortable and the DedroneDefender handheld jammer are being evaluated. Bands and range not published.',
   ARRAY[
     'Dedrone blog, Aug 2025: https://www.dedrone.com/blog/dedrone-by-axon-delivering-on-land-156-with-australias-first-national-counter-drone-network',
     'Dedrone blog, Oct 2024: https://www.dedrone.com/blog/axon-completes-acquisition-of-dedrone'
   ], 'medium'),

  ('aim-fractl', 'AIM Defence Fractl (portable high-energy laser)', 'AIM Defence', 'Australia',
   '{laser,directed_energy}', '{}'::jsonb, 1500, NULL, NULL, NULL, NULL, '{}', false,
   'Portable high-energy laser. Maker claims: tracks at 3 km, damages sensors beyond 2 km, hard kill beyond 1.5 km (range field), 50 shots per charge, under 90 cents per shot, under 120 kg. Laser power not published. ADF: A$21.3m under ASCA Mission Syracuse (21 Apr 2026), to be integrated with LAND 156 C2. In development, not in service.',
   ARRAY[
     'AIM Defence site: https://www.aimdefence.com/',
     'Defense News, 24 Apr 2026: https://www.defensenews.com/global/asia-pacific/2026/04/24/australia-awards-contracts-for-counter-drone-tech-based-on-lasers-interceptors/',
     'Australian Defence Magazine, Apr 2026: https://www.australiandefence.com.au/news/news/aim-defence-and-sypaq-win-counter-drone-contracts'
   ], 'medium'),

  ('sypaq-corvo-strike', 'SYPAQ Corvo Strike (interceptor drone)', 'SYPAQ Systems', 'Australia',
   '{kinetic}', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, '{}', false,
   'Autonomous interceptor drone against medium-sized drones that can also act as a loitering munition. NIOA supplies the proximity fuze and fragmentation warhead. Airframe descriptions differ (winged with four propellers per Defense News; quadcopter in other coverage). Range and weight not published. ADF: A$10.4m under ASCA Mission Syracuse (21 Apr 2026). In development, not in service.',
   ARRAY[
     'Defense News, 24 Apr 2026: https://www.defensenews.com/global/asia-pacific/2026/04/24/australia-awards-contracts-for-counter-drone-tech-based-on-lasers-interceptors/',
     'SYPAQ news: https://www.sypaq.com.au/news/sypaq-leads-australias-counter-drone-innovation/',
     'Asia Pacific Defence Reporter: https://asiapacificdefencereporter.com/nioa-sypaq-team-up-on-counter-drone-capabilities/'
   ], 'medium')
ON CONFLICT (id) DO NOTHING;

-- EOS Slinger already exists as 'eos-slinger' with placeholder maker and sources.
-- It is the same system as the EOS R400 Slinger: correct it in place, no duplicate.
UPDATE anti_drone_systems SET
  name = 'EOS R400 Slinger (counter-drone remote weapon station)',
  manufacturer = 'Electro Optic Systems (EOS)',
  country = 'Australia',
  effective_range_m = 800,
  weight_kg = 355,
  conflict_notes = 'Vehicle remote weapon station. Maker flyer (2024): M230LF 30 x 113 mm cannon with proximity-fuzed rounds, 150 rounds, EchoGuard radar cueing, engages moving drones beyond 800 m (range field); 355 kg above the roof plus a 21 kg control group. At the first LAND 156 live fire (Exercise Southern Arrow 25, Cultana, Dec 2025) an R400 Slinger fired an M134D minigun from a Hawkei. ADF: $5.7m under ASCA Mission Syracuse (8 Jul 2026), described as combining a laser-guided rocket and a machine gun.',
  sources = ARRAY[
    'EOS Slinger flyer, 2024: https://eos-aus.com/wp-content/uploads/2023/11/EOS-Defence-Slinger-flyer.pdf',
    'EOS / Leidos release, 12 Dec 2025: https://eos-aus.com/news/leidos-delivers-successful-demonstration-of-integrated-counter-drone-capability-for-the-australian-defence-force/',
    'Defence Ministers release, 8 Jul 2026 (copy): https://www.globalsecurity.org/wmd/library/news/australia/2026/australia-260708-audod05.htm'
  ],
  data_confidence = 'medium'
WHERE id = 'eos-slinger';
