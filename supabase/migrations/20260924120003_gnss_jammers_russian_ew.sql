-- Russian EW systems with an open-source GNSS jamming or spoofing role.
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY. OSINT only.
-- Bands and radii are as published (manufacturer data compiled by COGINT, Russian
-- press, Wikipedia); where sources disagree the lower figure is stored and notes
-- give the spread. The table has no sources column, so sources are in notes.
-- Not added, because open sources do not support a GNSS role:
--   RB-341V Leer-3 (mobile-phone jamming via Orlan-10; no source says GNSS),
--   RB-301B Borisoglebsk-2 (HF/VHF/UHF comms jamming; GNSS claim only on Wikipedia),
--   Krasukha-2/-4 (radar jammers; stated bands 2.3-3.7 and 8.5-17.7 GHz exclude GNSS).
-- Idempotent: ON CONFLICT (id) DO NOTHING.

INSERT INTO gnss_jammers
  (id, name, manufacturer, country_of_origin, type, vehicle_platform, jammer_tier, procurement,
   cost_usd_approx, frequency_bands_jammed, effective_radius_km, power_watts, spoofing_capable,
   spoofing_software, also_jams, defeat_drones, does_not_defeat, known_operators, conflict_use,
   skill_required, self_jamming_risk, legal_status, notes, data_confidence)
VALUES
  ('r-330zh-zhitel', 'R-330Zh Zhitel', 'NVP Protek (Voronezh)', 'Russia', 'vehicle',
   'Ural-43203 or KamAZ-43114 truck with antenna trailer', 'tier_1_military', 'Russian Armed Forces', NULL,
   '{"gps_l1_mhz": "1575", "gps_l2_mhz": "1227", "gsm_mhz": "800-960", "satcom_l_band_mhz": "1500-1700", "dcs_pcs_mhz": "1700-1900"}'::jsonb,
   20, NULL, false, NULL,
   ARRAY['Inmarsat and Iridium satellite terminals', 'GSM-900/1800/1900 mobile phones'],
   '{}', '{}', ARRAY['Russian Armed Forces'],
   ARRAY['Georgia 2008', 'Crimea and Donbas 2014-2017 (including Debaltseve)', 'Ukraine 2022 onward'],
   NULL, NULL, NULL,
   'Jams GPS L1 and L2 plus satellite phones and mobile networks. Radius: 20-25 km against ground receivers and 50 km or more against airborne receivers (COGINT citing Protek); 30 km (Wikipedia); 20-30 km (Army Recognition). Stored radius is the lower ground figure. Sources: COGINT Russian EW Systems report (Jun 2023) https://sprotyvg7.com.ua/wp-content/uploads/2023/11/COGINT_Analytic_Insight_Report_Russian_EW_Systems__231119_114942.pdf ; https://en.wikipedia.org/wiki/R-330Zh_Zhitel ; https://www.armyrecognition.com/military-products/army/electronic-warfare/r-330zh-jamming-station-russia-uik ; https://jamestown.org/blind-confuse-and-demoralize-russian-electronic-warfare-operations-in-donbas/',
   'medium'),

  ('pole-21', 'Pole-21 (R-340RP) GNSS jamming network', 'NTTs REB (Scientific-Technical Centre for EW, Voronezh)', 'Russia', 'fixed',
   'R-340RP jamming posts on cell towers or masts; vehicle-mounted variants. Up to 100 posts per control panel', 'tier_1_military', 'Russian Armed Forces (adopted 2016)', NULL,
   '{"gnss_mhz": "1176-1602"}'::jsonb,
   25, NULL, false, NULL,
   '{}', '{}', '{}', ARRAY['Russian Armed Forces'],
   ARRAY['Russian exercises from 2020', 'Ukraine: post near Donetsk hit Nov 2023; post destroyed by Ukrainian border guards Apr 2024'],
   NULL, NULL, NULL,
   'Jams GPS, GLONASS, Galileo and BeiDou (1176-1602 MHz, covering GPS L1/L2/L5 and GLONASS L1/L2). Radius: at least 25 km per antenna module (Russian sources, stored); 25-75 km (COGINT citing Focus.ua); 80 km with a 20 W transmitter (Izvestia claim); 100 posts cover 150 x 150 km. Export version Pole-21E. Sources: https://www.armyrecognition.com/archives/archives-land-defense/land-defense-2016/pole-21-electronic-countermeasures-system-to-enter-in-service-with-russian-armed-forces-tass-11310161 ; COGINT report (Jun 2023) https://sprotyvg7.com.ua/wp-content/uploads/2023/11/COGINT_Analytic_Insight_Report_Russian_EW_Systems__231119_114942.pdf ; https://www.armyrecognition.com/focus-analysis-conflicts/army/conflicts-in-the-world/russia-ukraine-war-2022/ukrainian-uav-strikes-russian-pole-21-electronic-countermeasures-warfare-system ; https://unn.ua/en/news/border-guards-destroy-the-latest-russian-electronic-warfare-system-pole-21',
   'medium'),

  ('shipovnik-aero', 'Shipovnik-Aero counter-UAS EW complex', 'VNII Etalon (Vega, Rostec); produced by Sozvezdie', 'Russia', 'vehicle',
   'KamAZ truck', 'tier_1_military', 'Russian Armed Forces (shown at Army-2016)', NULL,
   '{"uas_link_mhz_1": "400-500", "uas_link_mhz_2": "800-925", "uas_link_mhz_3": "2400-2485"}'::jsonb,
   NULL, NULL, true,
   'Manufacturer claims it creates a false navigation field to land drones elsewhere. Mechanism not public: the stated transmit bands do not include the GNSS L-band.',
   ARRAY['Drone control links', 'Mobile phones, Wi-Fi, WiMAX and DECT'],
   '{}', '{}', ARRAY['Russian Armed Forces'],
   ARRAY['Reported near Donetsk, Jul 2016 (Ukrainian military intelligence via COGINT)'],
   NULL, NULL, NULL,
   'Counter-UAS EW complex. Monitors 25-2500 MHz and transmits in the three bands stored (COGINT citing Topwar 2012). About 10 km detection radius; jamming radius not published. GNSS spoofing is a manufacturer claim only. Sources: https://www.uasvision.com/2016/09/14/anti-uav-system-shown-at-russias-army-2016-forum/ ; https://i-hls.com/archives/71825 ; COGINT report (Jun 2023) https://sprotyvg7.com.ua/wp-content/uploads/2023/11/COGINT_Analytic_Insight_Report_Russian_EW_Systems__231119_114942.pdf',
   'estimated'),

  ('tobol-14ts227', 'Tobol (14Ts227) satellite EW complex', 'Russian Space Systems (RKS)', 'Russia', 'fixed',
   'Fixed sites at satellite-tracking stations (2, 7.3 and 9.1 m dishes); Kaliningrad (Pionersky) and Armavir sites described as mobile', 'tier_1_military', 'State contract Tobol-1, 3 May 2012', NULL,
   '{}'::jsonb,
   NULL, NULL, false, NULL,
   '{}', '{}', '{}', '{}',
   ARRAY['Reported test against Starlink in Ukraine (leaked US intelligence via Washington Post, Apr 2023)'],
   NULL, NULL, NULL,
   'GNSS role is assessed, not confirmed. Public procurement documents describe protecting Russian satellites from jamming. Analysts have linked Baltic GPS jamming from Kaliningrad to Tobol; this is inference, not official attribution. Bands and radius not public. Sources: https://thespacereview.com/article/4060/1 ; https://www.newsweek.com/russia-electronic-warfare-gps-jamming-nato-finland-poland-sweden-kaliningrad-ukraine-1863096 ; https://en.defence-ua.com/weapon_and_tech/does_russian_14ts227_tobol_system_have_the_power_to_suppress_starlink-6454.html',
   'estimated')
ON CONFLICT (id) DO NOTHING;
