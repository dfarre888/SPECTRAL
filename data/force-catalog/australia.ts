/**
 * Force Catalogue: Australia (Blue). Tranche 1 / quality-bar reference.
 * OSINT only. Sensor/comms descriptive; performance pins to SOVEREIGN_CORE_BOUNDARY.
 * Verified current-inventory status: 24 Sep 2026 (ADF context brief audit).
 * Sources: Wikipedia current-inventory lists (RAAF/Army/RAN), Defence and Defence
 * Ministers releases, defence press (Defence Connect, Naval News, Breaking Defense).
 *
 * Deliberately absent: MQ-9B SkyGuardian. Project AIR 7003 was cancelled in
 * April 2022 (Defence to Senate estimates, 1 Apr 2022; funds moved to REDSPICE).
 * It is not in ADF service or on order. Do not re-add it as an ADF platform.
 * https://www.defenceconnect.com.au/air/9785-mq-9b-skyguardian-project-axed
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  hfVoice, link16, madl, nationFactory, pinnedSensor, withBands, satcom, uhfVoice,
} from '@/data/force-catalog/_helpers'

const SRC_RAAF = 'Wikipedia: List of current RAAF aircraft (2026)'
const SRC_ARMY = 'Wikipedia: List of equipment of the Australian Army (2026)'
const SRC_RAN = 'Wikipedia: List of active Royal Australian Navy ships (2026)'

// Official releases cited by the Sep 2026 audit.
const SRC_ISR_IOC = 'Defence Ministers release, 22 Sep 2026: https://www.minister.defence.gov.au/media-releases/2026-09-22/major-milestones-australias-air-intelligence-surveillance-reconnaissance-capabilities'
const SRC_NASAMS_FOC = 'Defence Ministers release, 9 Sep 2026: https://www.minister.defence.gov.au/media-releases/2026-09-09/armys-world-class-air-defence-capability-ready-operations'
const SRC_GHOSTBAT = 'Defence Ministers release, 9 Dec 2025: https://www.minister.defence.gov.au/media-releases/2025-12-09/funding-boost-australian-made-ghost-bat'
const SRC_HIMARS2 = 'Defence Ministers release, 28 Apr 2026: https://www.minister.defence.gov.au/media-releases/2026-04-28/albanese-government-strengthens-armys-long-range-strike-capability'
const SRC_BLUEBOTTLE = 'Defence Ministers release, 11 Mar 2026: https://www.minister.defence.gov.au/media-releases/2026-03-11/albanese-government-invests-176-million-new-fleet-australian-made-uncrewed-vessels'
const SRC_MASU = 'Naval News, Apr 2026: https://www.navalnews.com/naval-news/2026/04/royal-australian-navy-names-autonomous-systems-unit/'
const SRC_GPF = 'Defence Ministers release, 18 Apr 2026: https://www.minister.defence.gov.au/media-releases/2026-04-18/australia-locks-delivery-our-first-three-general-purpose-frigates'
const SRC_SEARAM = 'Naval News, May 2026: https://www.navalnews.com/naval-news/2026/05/upgraded-mogami-frigates-for-australia-to-receive-searam/'
const SRC_NGJ = 'The Aviationist, 22 Apr 2026: https://theaviationist.com/2026/04/22/raytheon-confirms-delivery-next-generation-jammer-australia/'
const SRC_TAIPAN = 'Defence Ministers release, 9 Jul 2026: https://www.minister.defence.gov.au/media-releases/2026-07-09/australia-achieves-landmark-prototype-missile-defence-live-fire'
const SRC_LAND156_LIVEFIRE = 'Defence news, 24 Dec 2025: https://www.defence.gov.au/news-events/news/2025-12-24/army-tests-counter-drone-technology'
const SRC_AUSTRAL_SHIELD = 'CONTACT (Defence story), 8 Aug 2026: https://contactairlandandsea.com/2026/08/08/counter-drone-tech-tested-on-aussie-exercise/'
const SRC_TS27_DRONES = 'Defence Connect, 24 Sep 2026: https://www.defenceconnect.com.au/land/18907-australian-army-accelerating-drone-warfare-integration-towards-talisman-sabre-2027-debut'
const SRC_TS27_FPV = 'Defence Connect, 17 Aug 2026: https://www.defenceconnect.com.au/land/18726-australian-army-to-field-fpv-strike-drone-team-for-talisman-sabre-2027'

const P = nationFactory('AUS', 'Australia')

export const AUSTRALIA_CATALOG: ForceCatalogPlatformFull[] = [
  // ── AIR: combat ───────────────────────────────────────────────────────────
  P({
    id: 'AUS-CAT-F35A', designation: 'F-35A Lightning II', short_name: 'F-35A',
    manufacturer: 'Lockheed Martin', domain: 'air', role: 'multirole', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2021,
    open_source_summary: '72 aircraft. RAAF fifth-generation multirole backbone (3 squadrons plus OCU).',
    data_confidence: 'high', sources: [SRC_RAAF],
    comms: [madl('AUS-CAT-F35A'), link16('AUS-CAT-F35A'), uhfVoice('AUS-CAT-F35A')],
    sensors: [
      pinnedSensor('AUS-CAT-F35A', 'radar', 'AN/APG-81 AESA', 'X', 'fire-control / SAR',
        ['aircraft', 'cruise_missile', 'surface_contacts'], [], 'X-band AESA, OSINT descriptive'),
      withBands(pinnedSensor('AUS-CAT-F35A', 'eo_ir', 'AN/AAQ-40 EOTS + AN/AAQ-37 DAS', 'IR',
        'targeting / missile warning', ['aircraft', 'ground_targets'], [], 'EO/IR suite, descriptive'), ['MWIR'], ['https://www.lockheedmartin.com/en-us/products/f-35-lightning-ii-eots.html', 'https://www.northropgrumman.com/what-we-do/air/f-35-distributed-aperture-system']),
    ],
  }),
  P({
    id: 'AUS-CAT-FA18F', designation: 'F/A-18F Super Hornet', short_name: 'F/A-18F',
    manufacturer: 'Boeing', domain: 'air', role: 'multirole', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2010,
    open_source_summary: '24 aircraft. RAAF multirole strike and air superiority (No. 1 Squadron).',
    data_confidence: 'high', sources: [SRC_RAAF],
    comms: [link16('AUS-CAT-FA18F'), uhfVoice('AUS-CAT-FA18F')],
    sensors: [pinnedSensor('AUS-CAT-FA18F', 'radar', 'AN/APG-79 AESA', 'X', 'fire-control',
      ['aircraft', 'cruise_missile'], [], 'X-band AESA, descriptive')],
  }),
  P({
    id: 'AUS-CAT-EA18G', designation: 'EA-18G Growler', short_name: 'EA-18G',
    manufacturer: 'Boeing', domain: 'air', role: 'ew', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2017,
    open_source_summary: 'RAAF airborne electronic attack (No. 6 Squadron, Amberley); only non-US operator. First AN/ALQ-249 Next Generation Jammer Mid-Band pods delivered from Sep 2025; four pod pairs allocated to Australia under the Dec 2024 production contract.',
    data_confidence: 'high', sources: [SRC_RAAF, SRC_NGJ],
    comms: [link16('AUS-CAT-EA18G'), uhfVoice('AUS-CAT-EA18G')],
    sensors: [pinnedSensor('AUS-CAT-EA18G', 'esm', 'ALQ-218 receiver + ALQ-99 and ALQ-249 NGJ-MB pods', null,
      'electronic attack / ESM', ['radar_emitters', 'comms_emitters'], [], 'AEA suite, descriptive')],
  }),
  // ── AIR: ISR / AEW&C / EW ─────────────────────────────────────────────────
  P({
    id: 'AUS-CAT-E7A', designation: 'E-7A Wedgetail', short_name: 'E-7A',
    manufacturer: 'Boeing', domain: 'air', role: 'aew_c', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2012,
    open_source_summary: '6 aircraft. AEW&C and airborne battle-management gateway (No. 2 Squadron).',
    data_confidence: 'high', sources: [SRC_RAAF],
    comms: [link16('AUS-CAT-E7A', true), satcom('AUS-CAT-E7A'), uhfVoice('AUS-CAT-E7A'), hfVoice('AUS-CAT-E7A')],
    sensors: [pinnedSensor('AUS-CAT-E7A', 'radar', 'Northrop Grumman MESA', 'L',
      'AEW / air & maritime surveillance', ['aircraft', 'cruise_missile', 'large_uas', 'surface_contacts'],
      ['small_uas'], 'L-band AESA AEW, descriptive; ranges pinned')],
  }),
  P({
    id: 'AUS-CAT-P8A', designation: 'P-8A Poseidon', short_name: 'P-8A',
    manufacturer: 'Boeing', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2017,
    open_source_summary: '12 aircraft (14 planned by end 2026). Maritime patrol, ASW and ISR.',
    data_confidence: 'high', sources: [SRC_RAAF],
    comms: [link16('AUS-CAT-P8A'), satcom('AUS-CAT-P8A'), hfVoice('AUS-CAT-P8A')],
    sensors: [pinnedSensor('AUS-CAT-P8A', 'radar', 'AN/APY-10 maritime surveillance', 'X',
      'maritime search', ['surface_contacts', 'periscopes'], [], 'Maritime radar, descriptive')],
  }),
  P({
    id: 'AUS-CAT-MC55A', designation: 'MC-55A Peregrine', short_name: 'MC-55A',
    manufacturer: 'L3Harris / Gulfstream', domain: 'air', role: 'ew', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2026,
    open_source_summary: 'ISR and electronic warfare aircraft (No. 10 Squadron, RAAF Base Edinburgh). Initial operational capability declared 22 Sep 2026. 3 of 4 delivered; the fourth is due later in 2026.',
    data_confidence: 'high', sources: [SRC_ISR_IOC, SRC_RAAF],
    comms: [satcom('AUS-CAT-MC55A'), link16('AUS-CAT-MC55A')],
    sensors: [pinnedSensor('AUS-CAT-MC55A', 'esm', 'SIGINT/ELINT suite', null, 'signals intelligence',
      ['radar_emitters', 'comms_emitters'], [], 'SIGINT, capability descriptive only')],
  }),
  // ── AIR: mobility / tanker ────────────────────────────────────────────────
  P({
    id: 'AUS-CAT-KC30A', designation: 'KC-30A MRTT', short_name: 'KC-30A',
    manufacturer: 'Airbus', domain: 'air', role: 'tanker', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2011,
    open_source_summary: '7 aircraft. Air-to-air refuelling and strategic airlift.',
    data_confidence: 'high', sources: [SRC_RAAF],
    comms: [satcom('AUS-CAT-KC30A'), uhfVoice('AUS-CAT-KC30A'), hfVoice('AUS-CAT-KC30A')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-C17A', designation: 'C-17A Globemaster III', short_name: 'C-17A',
    manufacturer: 'Boeing', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2006,
    open_source_summary: '8 aircraft. Strategic heavy airlift.',
    data_confidence: 'high', sources: [SRC_RAAF],
    comms: [satcom('AUS-CAT-C17A'), uhfVoice('AUS-CAT-C17A'), hfVoice('AUS-CAT-C17A')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-C130J', designation: 'C-130J-30 Hercules', short_name: 'C-130J',
    manufacturer: 'Lockheed Martin', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1999,
    open_source_summary: 'Tactical airlift. Fleet expanding under a new C-130J-30 order.',
    data_confidence: 'high', sources: [SRC_RAAF],
    comms: [uhfVoice('AUS-CAT-C130J'), hfVoice('AUS-CAT-C130J')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-MQ28', designation: 'MQ-28A Ghost Bat', short_name: 'MQ-28',
    manufacturer: 'Boeing Defence Australia', domain: 'air', role: 'other', force_side: 'blue',
    service_status: 'ordered', program_stage: 'lrip', ioc_year: null,
    open_source_summary: 'Collaborative combat aircraft. Destroyed an aerial target with an AIM-120 in Dec 2025. About $1.4b package (Dec 2025) buys 6 operational Block 2 aircraft and an enhanced Block 3 prototype.',
    data_confidence: 'high', sources: [SRC_GHOSTBAT, SRC_RAAF],
    platform_library_id: 'ghost-bat',
    comms: [link16('AUS-CAT-MQ28')], sensors: [], future: {
      platform_id: 'AUS-CAT-MQ28', program_name: 'MQ-28A Ghost Bat (AIR 6014)',
      lead_contractor: 'Boeing Defence Australia', partner_nations: ['USA'],
      first_flight_est: '2021 (achieved)', ioc_est: 'Operational capability targeted for 2028 (reported)',
      key_features: ['autonomous teaming', 'modular sensor nose', 'AIM-120 live fire Dec 2025'],
      status_note: '6 Block 2 aircraft and a Block 3 prototype on contract over about three years.',
      data_confidence: 'high', sources: [SRC_GHOSTBAT],
    },
  }),
  // ── AIR: rotary (Army aviation) ───────────────────────────────────────────
  P({
    id: 'AUS-CAT-AH64E', designation: 'AH-64E Apache Guardian', short_name: 'AH-64E',
    manufacturer: 'Boeing', domain: 'air', role: 'other', force_side: 'blue',
    service_status: 'ordered', program_stage: 'fielded', ioc_year: 2025,
    open_source_summary: '29 attack helicopters replacing Tiger ARH (withdrawal by end 2026); progressive delivery.',
    data_confidence: 'high', sources: [SRC_ARMY, 'Defense News, Dec 2025'],
    comms: [link16('AUS-CAT-AH64E'), uhfVoice('AUS-CAT-AH64E')],
    sensors: [pinnedSensor('AUS-CAT-AH64E', 'radar', 'AN/APG-78 Longbow', 'Ku', 'fire-control',
      ['ground_targets', 'helicopters'], [], 'Longbow mmW radar, descriptive')],
  }),
  P({
    id: 'AUS-CAT-UH60M', designation: 'UH-60M Black Hawk', short_name: 'UH-60M',
    manufacturer: 'Sikorsky', domain: 'air', role: 'other', force_side: 'blue',
    service_status: 'ordered', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: '40 utility helicopters replacing MRH-90 Taipan; progressive delivery.',
    data_confidence: 'high', sources: [SRC_ARMY],
    comms: [uhfVoice('AUS-CAT-UH60M')], sensors: [],
  }),

  // ── LAND: armour / fires ──────────────────────────────────────────────────
  P({
    id: 'AUS-CAT-M1A2', designation: 'M1A2 SEPv3 Abrams', short_name: 'M1A2 SEPv3',
    manufacturer: 'General Dynamics Land Systems', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'ordered', program_stage: 'fielded', ioc_year: 2025,
    open_source_summary: '75 main battle tanks replacing M1A1; 2nd Cavalry Regiment fully equipped.',
    data_confidence: 'high', sources: [SRC_ARMY, 'Defence Connect'],
    comms: [uhfVoice('AUS-CAT-M1A2')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-BOXER', designation: 'Boxer CRV', short_name: 'Boxer',
    manufacturer: 'Rheinmetall', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'ordered', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: '211 combat reconnaissance vehicles (LAND 400 Phase 2).',
    data_confidence: 'high', sources: [SRC_ARMY],
    comms: [uhfVoice('AUS-CAT-BOXER')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-REDBACK', designation: 'AS21 Redback IFV', short_name: 'Redback',
    manufacturer: 'Hanwha Defense', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'ordered', program_stage: 'lrip', ioc_year: null,
    open_source_summary: '129 infantry fighting vehicles (LAND 400 Phase 3); deliveries 2027 to 2030.',
    data_confidence: 'high', sources: [SRC_ARMY],
    comms: [uhfVoice('AUS-CAT-REDBACK')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-AS9', designation: 'AS9 Huntsman SPH', short_name: 'AS9',
    manufacturer: 'Hanwha Defense', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'ordered', program_stage: 'lrip', ioc_year: 2026,
    open_source_summary: '30 self-propelled howitzers (LAND 8116); first 3 completed Feb 2026.',
    data_confidence: 'high', sources: [SRC_ARMY, 'Asian Military Review'],
    comms: [uhfVoice('AUS-CAT-AS9')], sensors: [],
  }),

  // ── MARITIME: surface / sub-surface ───────────────────────────────────────
  P({
    id: 'AUS-CAT-HOBART', designation: 'Hobart-class DDG', short_name: 'Hobart DDG',
    manufacturer: 'Navantia / ASC', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2017,
    open_source_summary: '3 air warfare destroyers. Aegis combat system; fleet air defence.',
    data_confidence: 'high', sources: [SRC_RAN],
    comms: [link16('AUS-CAT-HOBART', true), satcom('AUS-CAT-HOBART'), hfVoice('AUS-CAT-HOBART')],
    sensors: [pinnedSensor('AUS-CAT-HOBART', 'radar', 'AN/SPY-1D(V) phased array', 'S',
      'air/missile surveillance & fire-control', ['aircraft', 'cruise_missile', 'ballistic_tracks'],
      [], 'S-band Aegis radar, descriptive; ranges pinned')],
  }),
  P({
    id: 'AUS-CAT-ANZAC', designation: 'Anzac-class FFH', short_name: 'Anzac FFH',
    manufacturer: 'Tenix / BAE', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'retiring', program_stage: 'fielded', ioc_year: 1996,
    open_source_summary: 'Frigates (Arunta decommissioning 2026). AMCAP upgrade with CEAFAR L-band radar.',
    data_confidence: 'high', sources: [SRC_RAN],
    comms: [link16('AUS-CAT-ANZAC'), satcom('AUS-CAT-ANZAC'), hfVoice('AUS-CAT-ANZAC')],
    sensors: [pinnedSensor('AUS-CAT-ANZAC', 'radar', 'CEAFAR2 AESA (AMCAP)', 'L',
      'air/surface surveillance', ['aircraft', 'surface_contacts'], [], 'CEA phased array, descriptive')],
  }),
  P({
    id: 'AUS-CAT-COLLINS', designation: 'Collins-class SSG', short_name: 'Collins SSG',
    manufacturer: 'ASC', domain: 'maritime', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1996,
    open_source_summary: '6 diesel-electric attack submarines; life-of-type extension under way.',
    data_confidence: 'high', sources: [SRC_RAN],
    comms: [hfVoice('AUS-CAT-COLLINS'), satcom('AUS-CAT-COLLINS')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-GHOSTSHARK', designation: 'Ghost Shark XL-AUV', short_name: 'Ghost Shark',
    manufacturer: 'Anduril Australia', domain: 'maritime', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'lrip', ioc_year: 2026,
    open_source_summary: 'Extra-large autonomous undersea vehicle. $1.7b five-year contract (Sep 2025). Operated by the RAN Maritime Autonomous Systems Unit, named 14 Apr 2026 under SEA 1200.',
    data_confidence: 'high', sources: [SRC_MASU, SRC_RAN],
    platform_library_id: 'ghost-shark',
    comms: [satcom('AUS-CAT-GHOSTSHARK')], sensors: [], future: {
      platform_id: 'AUS-CAT-GHOSTSHARK', program_name: 'Ghost Shark XL-AUV (SEA 1200)',
      lead_contractor: 'Anduril Australia', partner_nations: [],
      first_flight_est: 'prototypes delivered 2025', ioc_est: '2026 (production)',
      key_features: ['long-endurance autonomy', 'ISR / strike / mine payloads', 'crewless deep operations'],
      status_note: '$1.7b contract Sep 2025 for delivery, sustainment and development; Maritime Autonomous Systems Unit named Apr 2026.',
      data_confidence: 'high', sources: [SRC_MASU],
    },
  }),
  P({
    id: 'AUS-CAT-BLUEBOTTLE', designation: 'Bluebottle uncrewed surface vessel', short_name: 'Bluebottle',
    manufacturer: 'Ocius Technology', domain: 'maritime', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'lrip', ioc_year: null,
    open_source_summary: '15 in RAN service, mostly on Operation Resolute surveillance. $176m program of record (Mar 2026) adds 40 over five years, taking the fleet to 55.',
    data_confidence: 'high', sources: [SRC_BLUEBOTTLE, SRC_MASU],
    comms: [satcom('AUS-CAT-BLUEBOTTLE')], sensors: [],
  }),

  // ── FUTURE PROGRAMS ───────────────────────────────────────────────────────
  P({
    id: 'AUS-CAT-HUNTER', designation: 'Hunter-class FFG', short_name: 'Hunter FFG',
    manufacturer: 'BAE Systems Australia', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_development', program_stage: 'emd', ioc_year: null,
    open_source_summary: 'Future ASW frigate (Type 26 derivative) with CEAFAR2 and Aegis. First of class building.',
    data_confidence: 'high', sources: [SRC_RAN, 'RAN Hunter-class program'],
    comms: [link16('AUS-CAT-HUNTER', true), satcom('AUS-CAT-HUNTER')], sensors: [], future: {
      platform_id: 'AUS-CAT-HUNTER', program_name: 'SEA 5000 Hunter-class frigate',
      lead_contractor: 'BAE Systems Australia', partner_nations: ['GBR'],
      first_flight_est: null, ioc_est: 'est. early 2030s',
      key_features: ['anti-submarine warfare', 'CEAFAR2 L-band AESA', 'Aegis + SAAB 9LV'],
      status_note: 'Batch 1 of 6 building at Osborne; scope reduced under the 2024 Surface Fleet Review.',
      data_confidence: 'high', sources: ['RAN; Australian Defence Magazine'],
    },
  }),
  P({
    id: 'AUS-CAT-NEWFFM', designation: 'Upgraded Mogami-class general purpose frigate', short_name: 'Upgraded Mogami',
    manufacturer: 'Mitsubishi Heavy Industries', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'ordered', program_stage: 'emd', ioc_year: null,
    open_source_summary: 'SEA 3000 general purpose frigate (up to 11). Contracts for the first three, built in Japan, signed 18 Apr 2026; first delivery due 2029. SeaRAM ordered for the first three.',
    data_confidence: 'high', sources: [SRC_GPF, SRC_SEARAM],
    comms: [link16('AUS-CAT-NEWFFM'), satcom('AUS-CAT-NEWFFM')], sensors: [], future: {
      platform_id: 'AUS-CAT-NEWFFM', program_name: 'SEA 3000 general purpose frigate',
      lead_contractor: 'Mitsubishi Heavy Industries', partner_nations: ['JPN'],
      first_flight_est: null, ioc_est: 'First ship delivery 2029',
      key_features: ['multi-mission', 'reduced crew', 'first three Japan-built, later hulls in WA', 'SeaRAM self-defence'],
      status_note: 'Australia’s first major surface combatant acquisition from Japan.',
      data_confidence: 'high', sources: [SRC_GPF],
    },
  }),
  P({
    id: 'AUS-CAT-SEARAM', designation: 'SeaRAM ship self-defence system (GP frigate)', short_name: 'SeaRAM',
    manufacturer: 'Raytheon', domain: 'maritime', role: 'other', force_side: 'blue',
    service_status: 'ordered', program_stage: 'fielded', ioc_year: null,
    open_source_summary: 'Close-in missile defence for the first three Upgraded Mogami frigates. Raytheon contract via MHI (May 2026) for launchers, blast test vehicles and installation support; system deliveries from late 2028.',
    data_confidence: 'high', sources: [SRC_SEARAM],
    comms: [], sensors: [],
  }),
  P({
    id: 'AUS-CAT-SSNAUKUS', designation: 'SSN-AUKUS', short_name: 'SSN-AUKUS',
    manufacturer: 'BAE / ASC (AUKUS)', domain: 'maritime', role: 'other', force_side: 'blue',
    service_status: 'in_development', program_stage: 'r_and_d', ioc_year: null,
    open_source_summary: 'Future nuclear-powered attack submarine (5 planned); RAN delivery early 2040s.',
    data_confidence: 'high', sources: [SRC_RAN, 'Australian Submarine Agency factsheet'],
    comms: [hfVoice('AUS-CAT-SSNAUKUS'), satcom('AUS-CAT-SSNAUKUS')], sensors: [], future: {
      platform_id: 'AUS-CAT-SSNAUKUS', program_name: 'SSN-AUKUS',
      lead_contractor: 'BAE Systems / Rolls-Royce / ASC', partner_nations: ['GBR', 'USA'],
      first_flight_est: null, ioc_est: 'est. early 2040s (RAN)',
      key_features: ['nuclear propulsion', 'replaces Collins', 'built Osborne SA'],
      status_note: 'Interim Virginia-class boats bridge capability from the early 2030s.',
      data_confidence: 'high', sources: ['ASA; RUSI; Lowy Institute'],
    },
  }),

  // ── GAP-FILL TRANCHE (Jul 2026 depth pass) ────────────────────────────────
  P({
    id: 'AUS-CAT-C27J', designation: 'C-27J Spartan', short_name: 'C-27J',
    manufacturer: 'Leonardo', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'Tactical airlifter for battlefield delivery and SOF support (small fleet).',
    data_confidence: 'high', sources: [SRC_RAAF],
    comms: [uhfVoice('AUS-CAT-C27J'), satcom('AUS-CAT-C27J')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-MQ4C', designation: 'MQ-4C Triton', short_name: 'MQ-4C',
    manufacturer: 'Northrop Grumman', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2026,
    open_source_summary: 'High-altitude long-endurance maritime ISR, complementing the P-8A. Initial operational capability declared 22 Sep 2026. 3 of 4 ordered delivered; operates from RAAF Bases Tindal and Edinburgh.',
    data_confidence: 'high', sources: [SRC_ISR_IOC, SRC_RAAF],
    comms: [satcom('AUS-CAT-MQ4C'), link16('AUS-CAT-MQ4C')],
    sensors: [pinnedSensor('AUS-CAT-MQ4C', 'radar', 'MFAS maritime surveillance radar', 'X',
      'maritime ISR', ['surface_contacts', 'large_uas'], [], 'HALE maritime radar, descriptive')],
  }),
  P({
    id: 'AUS-CAT-CH47F', designation: 'CH-47F Chinook', short_name: 'CH-47F',
    manufacturer: 'Boeing', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'Heavy-lift helicopter for Army troop and equipment movement.',
    data_confidence: 'high', sources: [SRC_ARMY],
    comms: [uhfVoice('AUS-CAT-CH47F')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-MH60R', designation: 'MH-60R Seahawk', short_name: 'MH-60R',
    manufacturer: 'Sikorsky', domain: 'air', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2013,
    open_source_summary: 'RAN shipborne ASW and anti-surface helicopter, embarked on surface combatants.',
    data_confidence: 'high', sources: [SRC_RAN],
    comms: [link16('AUS-CAT-MH60R'), uhfVoice('AUS-CAT-MH60R')],
    sensors: [pinnedSensor('AUS-CAT-MH60R', 'radar', 'AN/APS-153 multimode', 'X',
      'surface search / weather', ['surface_contacts'], [], 'Shipborne multimode radar, descriptive')],
  }),
  P({
    id: 'AUS-CAT-CANBERRA', designation: 'Canberra-class LHD', short_name: 'Canberra LHD',
    manufacturer: 'Navantia / BAE', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2014,
    open_source_summary: '2 landing helicopter docks for amphibious assault and disaster relief.',
    data_confidence: 'high', sources: [SRC_RAN],
    comms: [link16('AUS-CAT-CANBERRA'), satcom('AUS-CAT-CANBERRA'), uhfVoice('AUS-CAT-CANBERRA')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-SUPPLY', designation: 'Supply-class AOR', short_name: 'Supply AOR',
    manufacturer: 'Navantia', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2021,
    open_source_summary: '2 replenishment oilers for underway replenishment of task groups.',
    data_confidence: 'high', sources: [SRC_RAN],
    comms: [satcom('AUS-CAT-SUPPLY'), uhfVoice('AUS-CAT-SUPPLY'), hfVoice('AUS-CAT-SUPPLY')], sensors: [],
  }),

  // ── DEPTH PASS 2 (Jul 2026) ──
  P({
    id: 'AUS-CAT-HAWK127', designation: 'Hawk 127 LIFT', short_name: 'Hawk 127',
    manufacturer: 'BAE Systems', domain: 'air', role: 'trainer_lead_in', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2000,
    open_source_summary: 'Lead-in fighter trainer for the RAAF fast-jet pipeline (No. 76 and 79 Squadrons).',
    data_confidence: 'high', sources: [SRC_RAAF],
    comms: [uhfVoice('AUS-CAT-HAWK127'), link16('AUS-CAT-HAWK127')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-NASAMS', designation: 'NASAMS (Army short-range GBAD)', short_name: 'NASAMS',
    manufacturer: 'Kongsberg / Raytheon', domain: 'ground', role: 'radar_ground', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: null,
    open_source_summary: 'Final operational capability declared 9 Sep 2026. 16th Regiment RAA: two batteries of three fire units, CEA radars, Hawkei-mounted launchers, AIM-9X and AIM-120. Inner layer of joint air and missile defence (Short Range Ground Based Air Defence project).',
    data_confidence: 'high', sources: [SRC_NASAMS_FOC, SRC_ARMY],
    comms: [link16('AUS-CAT-NASAMS'), uhfVoice('AUS-CAT-NASAMS')],
    sensors: [pinnedSensor('AUS-CAT-NASAMS', 'radar', 'CEA / fire-distribution radars', 'X',
      'GBAD surveillance & engagement', ['aircraft', 'cruise_missile', 'large_uas'], [],
      'GBAD radars, descriptive')],
  }),
  P({
    id: 'AUS-CAT-MRGBAD', designation: 'Medium-range GBAD prototype (SM-2, CEA radar, virtualised Aegis)', short_name: 'MR-GBAD proto',
    manufacturer: 'CEA Technologies / Lockheed Martin', domain: 'ground', role: 'radar_ground', force_side: 'blue',
    service_status: 'prototype', program_stage: 'technology_demonstrator', ioc_year: null,
    open_source_summary: 'Prototype only. At Exercise Taipan Strike 26 (Jun 2026, Woomera) a CEA radar cued a virtualised Aegis weapon control system and a two-cell towed Derringer launcher, and an SM-2 destroyed a cruise missile target. Candidate for AIR 6502; not in service.',
    data_confidence: 'high', sources: [SRC_TAIPAN],
    comms: [link16('AUS-CAT-MRGBAD')],
    sensors: [pinnedSensor('AUS-CAT-MRGBAD', 'radar', 'CEA Technologies AESA', null,
      'surveillance & fire-control cueing', ['aircraft', 'cruise_missile'], [],
      'CEA radar cueing Aegis, descriptive; band not stated in release')],
    future: {
      platform_id: 'AUS-CAT-MRGBAD', program_name: 'AIR 6502 medium-range GBAD (candidate)',
      lead_contractor: null, partner_nations: ['USA'],
      first_flight_est: 'Live fire Jun 2026 (achieved)', ioc_est: null,
      key_features: ['SM-2 effector', 'CEA radar to Aegis integration', 'towed Derringer launcher'],
      status_note: 'IIP 2026 directed acceleration of a medium-range ground-based air defence capability.',
      data_confidence: 'high', sources: [SRC_TAIPAN],
    },
  }),
  P({
    id: 'AUS-CAT-ARAFURA', designation: 'Arafura-class OPV', short_name: 'Arafura OPV',
    manufacturer: 'Lürssen / ASC', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2022,
    open_source_summary: 'Offshore patrol vessels for constabulary and maritime security; progressive deliveries.',
    data_confidence: 'high', sources: [SRC_RAN],
    comms: [satcom('AUS-CAT-ARAFURA'), uhfVoice('AUS-CAT-ARAFURA'), hfVoice('AUS-CAT-ARAFURA')],
    sensors: [pinnedSensor('AUS-CAT-ARAFURA', 'radar', 'navigation / surface search suite', 'X',
      'surface surveillance', ['surface_contacts'], [], 'OPV surface radar, descriptive')],
  }),
  P({
    id: 'AUS-CAT-HIMARS', designation: 'M142 HIMARS (LAND 8113)', short_name: 'HIMARS',
    manufacturer: 'Lockheed Martin', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'Wheeled rocket artillery for Army long-range fires (GMLRS, PrSM). $2.3b approved Apr 2026 for a second long-range fires regiment with HIMARS and PrSM Increment 1. First Australian-made GMLRS fired Apr 2026.',
    data_confidence: 'high', sources: [SRC_HIMARS2, SRC_ARMY],
    comms: [uhfVoice('AUS-CAT-HIMARS'), satcom('AUS-CAT-HIMARS')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-TIGER', designation: 'Tiger ARH', short_name: 'Tiger ARH',
    manufacturer: 'Airbus Helicopters', domain: 'air', role: 'other', force_side: 'blue',
    service_status: 'retiring', program_stage: 'fielded', ioc_year: 2004,
    open_source_summary: 'Armed reconnaissance helicopter, retiring as AH-64E Apache enters service.',
    data_confidence: 'high', sources: [SRC_ARMY],
    comms: [uhfVoice('AUS-CAT-TIGER')], sensors: [],
  }),


  // ── BLUE GAP PASS (Jul 2026): Australia fills ──
  P({
    id: 'AUS-CAT-BUSHMASTER', designation: 'Bushmaster PMV', short_name: 'Bushmaster',
    manufacturer: 'Thales Australia', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2005,
    open_source_summary: 'Protected mobility vehicle. Army workhorse; also supplied to Ukraine.',
    data_confidence: 'high', sources: [SRC_ARMY, 'Defence Connect'],
    comms: [uhfVoice('AUS-CAT-BUSHMASTER')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-HAWKEI', designation: 'Hawkei PMV-L', short_name: 'Hawkei',
    manufacturer: 'Thales Australia', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'Protected light vehicle for command, liaison and specialist roles; carries NASAMS launchers and LAND 156 counter-drone fits.',
    data_confidence: 'high', sources: [SRC_ARMY, SRC_LAND156_LIVEFIRE],
    comms: [uhfVoice('AUS-CAT-HAWKEI')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-M777', designation: 'M777A2 155mm towed howitzer', short_name: 'M777A2',
    manufacturer: 'BAE Systems', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2011,
    open_source_summary: 'Lightweight towed 155mm howitzer; Army tube artillery backbone.',
    data_confidence: 'high', sources: [SRC_ARMY],
    comms: [uhfVoice('AUS-CAT-M777')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-PC21', designation: 'Pilatus PC-21', short_name: 'PC-21',
    manufacturer: 'Pilatus', domain: 'air', role: 'trainer_lead_in', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2017,
    open_source_summary: 'RAAF basic and lead-in trainer (AIR 5428 pilot training system).',
    data_confidence: 'high', sources: [SRC_RAAF],
    comms: [uhfVoice('AUS-CAT-PC21')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-LANDCRAFT', designation: 'Army littoral landing craft (LAND 8710)', short_name: 'LAND 8710 craft',
    manufacturer: 'TBD', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'ordered', program_stage: 'lrip', ioc_year: null,
    open_source_summary: 'Medium and heavy landing craft for Army littoral manoeuvre and Indo-Pacific sealift.',
    data_confidence: 'medium', sources: [SRC_ARMY, 'Australian DoD'],
    comms: [uhfVoice('AUS-CAT-LANDCRAFT'), satcom('AUS-CAT-LANDCRAFT')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-CAPE', designation: 'Cape-class / Evolved Cape patrol boat', short_name: 'Cape-class',
    manufacturer: 'Austal', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2013,
    open_source_summary: 'Border Force and Navy patrol boats for constabulary and maritime security.',
    data_confidence: 'medium', sources: [SRC_RAN, 'ABF'],
    comms: [satcom('AUS-CAT-CAPE'), uhfVoice('AUS-CAT-CAPE'), hfVoice('AUS-CAT-CAPE')], sensors: [],
  }),
  P({
    id: 'AUS-CAT-NSM', designation: 'Naval Strike Missile (maritime strike)', short_name: 'NSM',
    manufacturer: 'Kongsberg', domain: 'maritime', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'Ship-launched anti-ship missile on the Hobart and Anzac path, plus land maritime-strike options. OSINT descriptive.',
    data_confidence: 'medium', sources: [SRC_RAN, 'Defence Connect'],
    comms: [], sensors: [],
  }),

  // ── ARMY DRONES AND COUNTER-DRONE (Sep 2026 audit) ────────────────────────
  // ADF small UAS holdings per the ADF context brief (24 Sep 2026). Status and
  // program facts only; flight performance lives in the Platform Library.
  P({
    id: 'AUS-CAT-BLACKHORNET', designation: 'Black Hornet 3 nano UAS', short_name: 'Black Hornet 3',
    manufacturer: 'Teledyne FLIR', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: null,
    open_source_summary: 'Pocket-sized nano helicopter for section-level reconnaissance. A$6.8m order Oct 2017, deliveries from 2018. No Australian Black Hornet 4 order found.',
    data_confidence: 'high', sources: [
      'Military Embedded Systems, Oct 2017: https://militaryembedded.com/unmanned/isr/australian-army-signs-6-8-million-contract-for-nano-sized-drones',
      'Defense News, 19 Sep 2024: https://www.defensenews.com/global/asia-pacific/2024/09/19/australian-army-to-grow-diversify-its-drone-fleet/',
    ],
    platform_library_id: 'teledyne-flir-black-hornet-3',
    comms: [], sensors: [],
  }),
  P({
    id: 'AUS-CAT-PUMA', designation: 'Puma small UAS', short_name: 'Puma',
    manufacturer: 'AeroVironment', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: null,
    open_source_summary: 'Hand-launched fixed-wing small UAS in Army holdings. PS News (Mar 2026) reports Corvo X replacing Wasp and Puma AE in artillery units.',
    data_confidence: 'medium', sources: [
      SRC_TS27_DRONES,
      'PS News, Mar 2026: https://psnews.com.au/army-artillery-troops-begin-introduction-of-new-small-uncrewed-aerial-systems/174702/',
    ],
    comms: [], sensors: [],
  }),
  P({
    id: 'AUS-CAT-WASP', designation: 'Wasp AE small UAS', short_name: 'Wasp AE',
    manufacturer: 'AeroVironment', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'retiring', program_stage: 'fielded', ioc_year: null,
    open_source_summary: 'Hand-launched micro UAS being replaced by SYPAQ Corvo X.',
    data_confidence: 'high', sources: [
      'Defense News, 19 Sep 2024: https://www.defensenews.com/global/asia-pacific/2024/09/19/australian-army-to-grow-diversify-its-drone-fleet/',
      'Australian Defence Magazine, May 2026: https://www.australiandefence.com.au/defence/land/sypaq-systems-corvo-x-enters-into-service',
    ],
    comms: [], sensors: [],
  }),
  P({
    id: 'AUS-CAT-CORVOX', designation: 'Corvo X small UAS', short_name: 'Corvo X',
    manufacturer: 'SYPAQ Systems', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2026,
    open_source_summary: 'Australian-made fixed-wing VTOL small UAS bought under DEF129 Phase 4B. Entry into service announced 7 May 2026; replaces Wasp AE.',
    data_confidence: 'high', sources: [
      'Australian Defence Magazine, May 2026: https://www.australiandefence.com.au/defence/land/sypaq-systems-corvo-x-enters-into-service',
      'sUAS News, May 2026: https://www.suasnews.com/2026/05/sypaq-systems-announces-successful-delivery-and-entry-into-service-of-corvo-x/',
    ],
    platform_library_id: 'sypaq-corvo-x',
    comms: [], sensors: [],
  }),
  P({
    id: 'AUS-CAT-VECTOR', designation: 'Vector AI VTOL small UAS', short_name: 'Vector AI',
    manufacturer: 'Quantum Systems', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: null,
    open_source_summary: 'Fixed-wing eVTOL ISR drone. Two DEF129 contracts worth A$90m (Apr 2024), assembled in Queensland. Army operating Vector AI from 2026, including at Exercise Black Prince 3 (May 2026, Cultana).',
    data_confidence: 'high', sources: [
      'Quantum Systems release, Apr 2024: https://www.prnewswire.com/news-releases/quantum-systems-inc-awarded-two-contracts-by-commonwealth-of-australia-for-def129-suas-totaling-aud-90-million-302196166.html',
      'Janes, 9 Jul 2026: https://www.janes.com/defence-intelligence-insights/defence-news/defence/australia-fields-vector-ai-surveillance-uav',
      SRC_TS27_DRONES,
    ],
    platform_library_id: 'quantum-vector-ai-isr-rsta',
    comms: [], sensors: [],
  }),
  P({
    id: 'AUS-CAT-R70', designation: 'SkyRanger R70 quadcopter', short_name: 'SkyRanger R70',
    manufacturer: 'Teledyne FLIR', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: null,
    open_source_summary: 'Small quadcopter ISR drone used by RAAF No. 3 Security Forces Squadron after about three years of trials (Defence, Nov 2020). Contract value and quantity not published.',
    data_confidence: 'medium', sources: [
      'Defence news, 17 Nov 2020: https://www.defence.gov.au/news-events/news/2020-11-17/sky-ranger-innovation-target',
      'Asian Military Review, Aug 2025: https://www.asianmilitaryreview.com/2025/08/keeping-up-with-the-droneses-australia-advances-its-c-uas-capabilities-foc/',
    ],
    platform_library_id: 'teledyne-flir-skyranger-r70',
    comms: [], sensors: [],
  }),
  P({
    id: 'AUS-CAT-INTEGRATOR', designation: 'Integrator tactical UAS (LAND 129 Phase 3)', short_name: 'Integrator',
    manufacturer: 'Insitu (Boeing)', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: null,
    open_source_summary: 'Runway-independent fixed-wing tactical UAS; 24 aircraft under LAND 129 Phase 3, built by Insitu Pacific in Queensland. Replaced the RQ-7B Shadow 200 with 20th Regiment RAA; training began Jul 2022.',
    data_confidence: 'high', sources: [
      'Defence project page: https://www.defence.gov.au/defence-activities/projects/tactical-uncrewed-aerial-system',
      'Defence news, 15 Jul 2025: https://www.defence.gov.au/news-events/news/2025-07-15/demand-drone-operators-set-soar',
    ],
    platform_library_id: 'insitu-integrator-isr',
    comms: [], sensors: [],
  }),
  P({
    id: 'AUS-CAT-SWITCHBLADE300', designation: 'Switchblade 300 loitering munition', short_name: 'Switchblade 300',
    manufacturer: 'AeroVironment', domain: 'air', role: 'other', force_side: 'blue',
    service_status: 'ordered', program_stage: 'fielded', ioc_year: null,
    open_source_summary: 'Man-portable loitering munition bought through US Foreign Military Sales, announced 8 Jul 2024. Defence planned first delivery in late 2024 and service entry in 2025. Variant not named by Defence (Block 20 reported).',
    data_confidence: 'high', sources: [
      'Defence Ministers release, 8 Jul 2024: https://www.minister.defence.gov.au/media-releases/2024-07-08/australian-government-announces-acquisition-precision-loitering-munition',
      'Janes, Jul 2024: https://www.janes.com/defence-intelligence-insights/defence-news/air/australia-procures-switchblade-loitering-munition',
    ],
    platform_library_id: 'switchblade-300',
    comms: [], sensors: [],
  }),
  P({
    id: 'AUS-CAT-OWLB', designation: 'OWL-B loitering munition', short_name: 'OWL-B',
    manufacturer: 'Innovaero', domain: 'air', role: 'other', force_side: 'blue',
    service_status: 'in_development', program_stage: 'emd', ioc_year: null,
    open_source_summary: 'Australian electric loitering munition in development and trial under ASCA Mission Talon-Strike (A$20.8m, 18 months, Oct 2025). Maritime trials from MV Sycamore. Service entry targeted for 2027.',
    data_confidence: 'medium', sources: [
      'ASCA post, Oct 2025: https://www.linkedin.com/posts/asca-aus_ascaaus-youadf-innovation-activity-7384099733864267776-J6kz',
      'Janes, Nov 2025: https://www.janes.com/osint-insights/defence-news/sea/indo-pacific-2025-australia-conducts-maritime-trials-of-owl-b-loitering-munition',
      'Australian Defence Magazine, Sep 2026: https://www.australiandefence.com.au/news/news/innovaero-to-list-on-asx',
    ],
    platform_library_id: 'innovaero-owl-b',
    comms: [], sensors: [], future: {
      platform_id: 'AUS-CAT-OWLB', program_name: 'ASCA Mission Talon-Strike',
      lead_contractor: 'Innovaero', partner_nations: [],
      first_flight_est: null, ioc_est: 'Target 2027',
      key_features: ['sovereign loitering munition', 'about 30 kg MTOW, warhead up to 7 kg (maker)'],
      status_note: 'A$20.8m ASCA contract, Oct 2025; test units due from late 2026.',
      data_confidence: 'medium', sources: ['Australian Defence Magazine; Janes'],
    },
  }),
  P({
    id: 'AUS-CAT-FPVSTRIKE', designation: 'Explosive FPV strike drone teams (Army RAS)', short_name: 'Army FPV teams',
    manufacturer: 'Various (Army-built and commercial)', domain: 'air', role: 'other', force_side: 'blue',
    service_status: 'in_development', program_stage: 'r_and_d', ioc_year: null,
    open_source_summary: 'Four-person teams (leader, 2IC, operator, navigator). Explosive FPV drones under $5,000 with about 20 km reach using repeater drones. 5/7 RAR fields an FPV strike combat team at Talisman Sabre 2027.',
    data_confidence: 'medium', sources: [SRC_TS27_DRONES, SRC_TS27_FPV],
    comms: [], sensors: [],
  }),
  P({
    id: 'AUS-CAT-LAND156', designation: 'LAND 156 counter-UAS systems', short_name: 'LAND 156 C-UAS',
    manufacturer: 'Leidos Australia (systems integrator)', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'lrip', ioc_year: null,
    open_source_summary: 'Army counter-drone program. First wave (Jul 2025): $16.9m to 11 vendors, including DroneShield DroneGun Mk4 and RfPatrol. Leidos Australia is systems integrator (Aug 2025) with Acacia Systems Cortex C2, Department 13 DART and Echodyne radar; the suite, with L3Harris VAMPIRE and an EOS R400 Slinger on Hawkei, first live-fired at Exercise Southern Arrow 25 (Dec 2025, Cultana). Silentium MAVERICK M8 passive radar selected Jan 2026. Portable kits (Dronebuster, KeyOptions SkyControl, RfPatrol Mk2) used at Exercise Austral Shield (Jul 2026).',
    data_confidence: 'high', sources: [
      SRC_LAND156_LIVEFIRE, SRC_AUSTRAL_SHIELD,
      'Australian Defence Magazine, Jul 2025: https://www.australiandefence.com.au/defence/land/popular-ukrainian-drone-detector-amongst-land-156-winners',
      'Australian Defence Magazine, Aug 2025: https://www.australiandefence.com.au/defence/land/leidos-selected-as-land-156-systems-integrator',
      'Australian Defence Magazine, Jan 2026: https://www.australiandefence.com.au/news/news/silentium-passive-radar-selected-for-land-156',
    ],
    comms: [uhfVoice('AUS-CAT-LAND156')],
    sensors: [pinnedSensor('AUS-CAT-LAND156', 'other', 'RF detection + counter-drone radar + EO', null,
      'counter-UAS detect, track, identify', ['small_uas'], [], 'LAND 156 sensor mix, descriptive')],
  }),
  P({
    id: 'AUS-CAT-SYRACUSE', designation: 'ASCA Mission Syracuse counter-drone effectors', short_name: 'Mission Syracuse',
    manufacturer: 'AIM Defence / SYPAQ Systems / EOS', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_development', program_stage: 'emd', ioc_year: null,
    open_source_summary: 'A$37.4m of ASCA contracts for lower-cost drone defeat: AIM Defence Fractl high-energy laser (A$21.3m) and SYPAQ Corvo Strike interceptor drone (A$10.4m), both 21 Apr 2026, and an EOS R400 Slinger (A$5.7m, 8 Jul 2026). Fractl is to be integrated with LAND 156 C2.',
    data_confidence: 'high', sources: [
      'Defense News, 24 Apr 2026: https://www.defensenews.com/global/asia-pacific/2026/04/24/australia-awards-contracts-for-counter-drone-tech-based-on-lasers-interceptors/',
      'Defence Ministers release, 8 Jul 2026 (copy): https://www.globalsecurity.org/wmd/library/news/australia/2026/australia-260708-audod05.htm',
    ],
    comms: [], sensors: [],
  }),
]
