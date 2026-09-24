-- ADF-relevant incidents for the Incident Timeline (Sep 2026 credibility pass).
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY. OSINT only.
-- Sources are public news and Defence releases. Media-only facts are graded 'Reported'.
-- Where the exact date is not published, the summary says so and names the pin date.
-- The two exercise rows are type 'other' and say "Exercise, not an incident" up front.
-- Idempotent: ON CONFLICT (id) DO NOTHING.

INSERT INTO conflict_incidents
  (id, conflict, conflict_name, incident_title, incident_type, occurred_at, date_range, location,
   lat, lon, result, summary, source_ref, sources, platforms_involved, confidence, data_confidence)
VALUES
  ('CI-AUS-001', 'Australia', 'Drone incursions at Defence sites (Australia)',
   'Drone incursions over RAAF Base Williamtown (July 2026)', 'other',
   '2026-07-11 00:00:00+10', '11-13 Jul 2026 (media-reported dates)', 'RAAF Base Williamtown, NSW',
   -32.795, 151.83444, 'unknown',
   'Multiple unidentified drones flew in restricted airspace over RAAF Base Williamtown, home of the RAAF F-35A fleet, over several nights in July. Media reports put the dates at 11 to 13 July. The incidents were referred to the NSW Police Counter-UAS Unit. Defence said it does not comment on specific security measures. Defence Industry Minister Pat Conroy would not say how many drones there were or what action, if any, was taken. Media reported that none were jammed or brought down.',
   'https://www.abc.net.au/news/2026-08-20/drones-breach-restricted-airspace-at-williamtown-raaf-base/107056708',
   ARRAY[
     'ABC News, 20 Aug 2026: https://www.abc.net.au/news/2026-08-20/drones-breach-restricted-airspace-at-williamtown-raaf-base/107056708',
     'Newcastle Herald, Aug 2026: https://www.newcastleherald.com.au/story/9327002/raaf-williamtown-drones-reportedly-breached-restricted-airspace/',
     'news.com.au (citing Daily Telegraph), Aug 2026: https://www.news.com.au/national/defence-experts-unleash-on-embarrassing-drone-breaches-at-raaf-base/news-story/fd930a026e72e8d0ccc8accd20199d77'
   ],
   '{}', 'Reported', 'medium'),

  ('CI-AUS-002', 'Australia', 'Drone incursions at Defence sites (Australia)',
   'Further drone incursions over RAAF Base Williamtown (August 2026)', 'other',
   '2026-08-01 00:00:00+10', 'early Aug 2026 (exact dates not published)', 'RAAF Base Williamtown, NSW',
   -32.795, 151.83444, 'unknown',
   'NSW Police confirmed on 20 Aug 2026 a second round of drone activity over RAAF Base Williamtown in early August and said police responded to assist the base. Exact dates and drone numbers were not published; the timeline pin is set to 1 Aug. Ministers did not say how Defence responded. Defence data reported by media shows 147 drone sightings at Defence sites in 2024-25, up from 60 in 2023-24.',
   'https://www.abc.net.au/news/2026-08-20/drones-breach-restricted-airspace-at-williamtown-raaf-base/107056708',
   ARRAY[
     'ABC News, 20 Aug 2026: https://www.abc.net.au/news/2026-08-20/drones-breach-restricted-airspace-at-williamtown-raaf-base/107056708',
     'Newcastle Herald, 20 Aug 2026: https://www.newcastleherald.com.au/story/9333813/williamtown-raaf-repeated-drone-activity-prompts-police-action/',
     '7NEWS, 13 Aug 2026 (Defence sighting figures): https://7news.com.au/sunrise/military-personnel-told-to-close-the-blinds-after-147-drone-breaches-reported-at-adf-bases-in-one-year-c-22715932'
   ],
   '{}', 'Reported', 'medium'),

  ('CI-GULF-009', 'Gulf', 'Iran-Gulf 2019-2026',
   'Iranian drone strike on Al Minhad Air Base (ADF presence)', 'uas_strike',
   '2026-03-03 00:00:00+04', 'first night of the conflict; reported 3 Mar 2026', 'Al Minhad Air Base, UAE',
   25.02683, 55.36633, NULL,
   'Defence Minister Richard Marles said an Iranian drone hit Al Minhad Air Base, about 40 km outside Dubai, on the first night of the conflict. About 100 ADF personnel were in the Middle East, most of them in the UAE. No Australians were hurt, and ABC later reported that this strike did no damage to Australian facilities. The drone type and exact date were not stated; the pin uses the 3 Mar 2026 report date.',
   'https://www.abc.net.au/news/2026-03-03/adf-personnel-safe-after-dubai-air-base-strike/106408590',
   ARRAY['ABC News, 3 Mar 2026: https://www.abc.net.au/news/2026-03-03/adf-personnel-safe-after-dubai-air-base-strike/106408590'],
   '{}', 'Confirmed', 'high'),

  ('CI-GULF-010', 'Gulf', 'Iran-Gulf 2019-2026',
   'Iranian strike damages Australian section of Al Minhad Air Base', 'strike',
   '2026-03-17 22:15:00+00', '18 Mar 2026, about 9:15am AEDT', 'Al Minhad Air Base, UAE',
   25.02683, 55.36633, NULL,
   'An Iranian projectile hit a road just outside Al Minhad Air Base at about 9:15am AEDT on 18 Mar 2026. The fire it started caused minor damage to an accommodation block and a medical facility in the Australian section of the base. No ADF personnel were hurt. ABC reported it was not clear whether the weapon was a missile or a drone.',
   'https://www.defence.gov.au/news-events/releases/2026-03-18/statement-strikes-al-minhad-air-base',
   ARRAY[
     'Defence statement, 18 Mar 2026: https://www.defence.gov.au/news-events/releases/2026-03-18/statement-strikes-al-minhad-air-base',
     'ABC News, 18 Mar 2026: https://www.abc.net.au/news/2026-03-18/al-minhad-air-base-attacked-by-iran-no-australians-hurt/106468378'
   ],
   '{}', 'Confirmed', 'high'),

  ('CI-SCS-001', 'South China Sea', 'South China Sea',
   'PLA claims electronic interference against HNLMS De Ruyter near the Paracels', 'ew',
   '2026-05-27 00:00:00+08', '27 May 2026 (PLA account)', 'Paracel Islands, South China Sea',
   16.83417, 112.3375, 'unknown',
   'The PLA Southern Theater Command said it used warnings and electronic interference to drive the Dutch frigate HNLMS De Ruyter and its NH90 helicopter away from the Paracel Islands on 27 May 2026. This is the PLA account. The Dutch government said the ship and helicopter stayed in international waters and airspace and continued their planned route. What was jammed, and to what effect, was not disclosed. The pin marks Woody Island, not the ship.',
   'https://news.usni.org/2026/05/27/chinese-use-electronic-warfare-attacks-on-dutch-warship-in-south-china-sea-says-pla',
   ARRAY[
     'USNI News, 27 May 2026: https://news.usni.org/2026/05/27/chinese-use-electronic-warfare-attacks-on-dutch-warship-in-south-china-sea-says-pla',
     'NOS (Dutch MoD response), 27 May 2026: https://nos.nl/artikel/2616065-chinees-leger-zegt-nederlands-fregat-te-hebben-verdreven-uit-zuid-chinese-zee'
   ],
   '{}', 'Reported', 'medium'),

  ('CI-AUS-003', 'Australia', 'ADF exercises',
   'Exercise Southern Arrow 25: first LAND 156 counter-drone live fire', 'other',
   '2025-12-01 00:00:00+10:30', 'early Dec 2025 (exact date not published)', 'Cultana Training Area, SA',
   -32.81667, 137.75, NULL,
   'Exercise, not an incident. Army live-fired the first iteration of the LAND 156 integrated counter-drone suite (the ICARUS acquisition, refresh and upgrade cycle) at the Cultana urban training facility in early December 2025. The suite combined Department 13 DART RF detection, Echodyne EchoGuard radar, L3Harris VAMPIRE rockets and an EOS R400 Slinger with M134D minigun, plus MAG-58 and M230LF guns on Hawkei vehicles. Leidos Australia is the systems integrator. The pin uses 1 Dec; the exact date was not published.',
   'https://www.defence.gov.au/news-events/news/2025-12-24/army-tests-counter-drone-technology',
   ARRAY[
     'Defence news, 24 Dec 2025: https://www.defence.gov.au/news-events/news/2025-12-24/army-tests-counter-drone-technology',
     'EOS / Leidos release, 12 Dec 2025: https://eos-aus.com/news/leidos-delivers-successful-demonstration-of-integrated-counter-drone-capability-for-the-australian-defence-force/'
   ],
   ARRAY['d13-dart', 'echodyne-echoguard', 'vampire-cuas', 'eos-slinger'], 'Confirmed', 'high'),

  ('CI-AUS-004', 'Australia', 'ADF exercises',
   'Exercise Austral Shield 2026: first collective counter-drone field training', 'other',
   '2026-07-03 00:00:00+10', '3-19 Jul 2026', 'Weipa, QLD',
   -12.63, 141.8786, NULL,
   'Exercise, not an incident. Under Joint Task Force 629, soldiers at Weipa trained with portable counter-drone systems from 3 to 19 July 2026: DroneBuster, KeyOptions Sky Control and DroneShield RfPatrol Mk2. Army described it as the first collective training in a tactical environment using counter-drone technology. The exercise also ran at Gladstone and Fleet Base West.',
   'https://contactairlandandsea.com/2026/08/08/counter-drone-tech-tested-on-aussie-exercise/',
   ARRAY[
     'CONTACT (Defence story), 8 Aug 2026: https://contactairlandandsea.com/2026/08/08/counter-drone-tech-tested-on-aussie-exercise/',
     'Defence news, 24 Jul 2026: https://www.defence.gov.au/news-events/news/2026-07-24/australian-defence-rehearsals-cross-continent',
     'Defence Connect, Jul 2026: https://www.defenceconnect.com.au/land/18651-adf-personnel-fight-aerial-threats-with-dronebuster-c-uas-during-exercise-austral-shield'
   ],
   ARRAY['dronebuster', 'keyoptions-sky-control', 'droneshield-rfpatrol-mk2'], 'Confirmed', 'high')
ON CONFLICT (id) DO NOTHING;
