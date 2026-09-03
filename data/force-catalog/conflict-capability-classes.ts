/**
 * Force Catalogue — Conflict Capability Classes (XCC).
 * OSINT only. Verified Jul 2026. Cross-cutting conflict-proven capability classes.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  nationFactory, nationalDatalink, pinnedSensor, satcom, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('XCC', 'Conflict Capability Classes')
const ndl = (id: string) => nationalDatalink(id, 'Conflict Capability Classes tactical datalink')

export const XCC_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'XCC-CAT-FO-FPV', designation: 'Fibre-optic FPV class', short_name: 'Fibre-optic FPV',
    manufacturer: null, domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'combat-proven: Ukraine 2024–26. Jam-resistant FPV guided by fibre tether — reshaped EW/C-UAS problem set.',
    data_confidence: 'medium', sources: ['OSINT Ukraine force reporting 2022–26', 'defence press'],
    comms: [uhfVoice('XCC-CAT-FO-FPV')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-USV-ATTR', designation: 'Attritable naval USV class', short_name: 'Attritable USV',
    manufacturer: null, domain: 'maritime', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2022,
    open_source_summary: 'combat-proven: Black Sea 2022–26. Low-cost USV swarms damaged/sank significant share of Russian Black Sea Fleet.',
    data_confidence: 'medium', sources: ['OSINT Ukraine force reporting 2022–26', 'defence press'],
    comms: [uhfVoice('XCC-CAT-USV-ATTR')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-ASBM-SHIP', designation: 'ASBM vs shipping class', short_name: 'ASBM shipping',
    manufacturer: null, domain: 'ground', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'combat-proven: Red Sea 2023–26. Anti-ship ballistic missiles used against merchant and naval shipping.',
    data_confidence: 'medium', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [uhfVoice('XCC-CAT-ASBM-SHIP')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-OWA-SAT', designation: 'Mass OWA drone saturation', short_name: 'OWA saturation',
    manufacturer: null, domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2022,
    open_source_summary: 'combat-proven: Ukraine 2022–26; Red Sea 2023–26. Nightly Shahed/Geran-class saturation stressing magazine depth.',
    data_confidence: 'high', sources: ['OSINT Ukraine force reporting 2022–26', 'defence press', 'OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [uhfVoice('XCC-CAT-OWA-SAT')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-UMPK', designation: 'UMPK-class glide bomb', short_name: 'UMPK glide',
    manufacturer: 'Russian industry', domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'combat-proven: Ukraine 2023–26. Cheap standoff PGM kits on legacy FAB iron bombs.',
    data_confidence: 'medium', sources: ['OSINT Ukraine force reporting 2022–26', 'defence press'],
    comms: [uhfVoice('XCC-CAT-UMPK')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-INT-ECON', designation: 'Interceptor magazine economics', short_name: 'Interceptor economics',
    manufacturer: null, domain: 'ground', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'combat-proven: Ukraine/Israel/Red Sea 2023–26. Costly interceptors vs cheap OWA/ballistic saturation.',
    data_confidence: 'medium', sources: ['OSINT magazine-depth analyses'],
    comms: [uhfVoice('XCC-CAT-INT-ECON')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-CUAS-LAYER', designation: 'Layered C-UAS defeat class', short_name: 'Layered C-UAS',
    manufacturer: null, domain: 'ground', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'combat-proven: Ukraine 2022–26. RF guns, Coyote, Roadrunner-M, Skynex, HPM, vehicle lasers — layered stack.',
    data_confidence: 'estimated', sources: ['OSINT C-UAS fielding reports'],
    comms: [uhfVoice('XCC-CAT-CUAS-LAYER')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-GNSS-DENY', designation: 'Theatre GNSS denial', short_name: 'GNSS denial',
    manufacturer: null, domain: 'ground', role: 'ew', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2022,
    open_source_summary: 'combat-proven: Ukraine/Baltic/Middle East 2022–26. Wide-area jamming/spoofing affecting military and civil aviation.',
    data_confidence: 'medium', sources: ['OSINT GNSS interference reports'],
    comms: [uhfVoice('XCC-CAT-GNSS-DENY')],
    sensors: [pinnedSensor('XCC-CAT-GNSS-DENY', 'esm', 'GNSS jamming/spoofing emitters', 'L', 'NAVWAR',
      ['gnss_receivers'], [], 'Theatre NAVWAR — descriptive')],
  }),
  P({
    id: 'XCC-CAT-COTS-MIL', designation: 'COTS militarisation class', short_name: 'COTS militarised',
    manufacturer: null, domain: 'air', role: 'isr', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2016,
    open_source_summary: 'combat-proven: Ukraine/ISIS/Sudan. Starlink C2, DJI Mavic recon, 3D-printed munitions.',
    data_confidence: 'medium', sources: ['OSINT COTS UAS employment'],
    comms: [satcom('XCC-CAT-COTS-MIL'), uhfVoice('XCC-CAT-COTS-MIL')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-SUPPLY', designation: 'Supply-chain / non-kinetic attack', short_name: 'Supply-chain attack',
    manufacturer: null, domain: 'ground', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'combat-proven: Israel–Hezbollah 2024 pager/walkie-talkie operation. Capability class, not a kinetic platform.',
    data_confidence: 'estimated', sources: ['OSINT Sept 2024 pager operation reporting'],
    comms: [uhfVoice('XCC-CAT-SUPPLY')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-STARLINK', designation: 'Starlink militarised C2', short_name: 'Starlink C2',
    manufacturer: 'SpaceX', domain: 'ground', role: 'comms_node', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2022,
    open_source_summary: 'combat-proven: Ukraine 2022–26. Commercial LEO SATCOM enabling resilient tactical C2.',
    data_confidence: 'high', sources: ['OSINT Ukraine force reporting 2022–26', 'defence press'],
    comms: [satcom('XCC-CAT-STARLINK'), uhfVoice('XCC-CAT-STARLINK')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-MAVIC', designation: 'COTS DJI Mavic recon class', short_name: 'DJI Mavic class',
    manufacturer: 'DJI', domain: 'air', role: 'isr', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2016,
    open_source_summary: 'combat-proven: Ukraine 2022–26; ISIS precedent. Ubiquitous COTS quadcopter ISR.',
    data_confidence: 'high', sources: ['OSINT Ukraine force reporting 2022–26', 'defence press'],
    comms: [uhfVoice('XCC-CAT-MAVIC')],
    sensors: [],
  }),

  P({
    id: 'XCC-CAT-HARPY', designation: 'IAI Harpy anti-radiation loitering', short_name: 'Harpy',
    manufacturer: 'IAI', domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1990,
    open_source_summary: 'combat-proven: Nagorno-Karabakh 2020. Anti-radiation loitering vs legacy SAM.',
    data_confidence: 'medium', sources: ['OSINT Nagorno-Karabakh 2020 lessons', 'defence press'],
    comms: [uhfVoice('XCC-CAT-HARPY')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-HAROP', designation: 'IAI Harop loitering munition', short_name: 'Harop',
    manufacturer: 'IAI', domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2009,
    open_source_summary: 'combat-proven: Nagorno-Karabakh 2020. EO man-in-loop loitering.',
    data_confidence: 'high', sources: ['OSINT Nagorno-Karabakh 2020 lessons', 'defence press'],
    platform_library_id: 'iai-harop',
    comms: [uhfVoice('XCC-CAT-HAROP')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-SKYSTRIKER', designation: 'SkyStriker loitering munition', short_name: 'SkyStriker',
    manufacturer: 'Elbit', domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'combat-proven: Nagorno-Karabakh 2020. Man-in-loop loitering.',
    data_confidence: 'medium', sources: ['OSINT Nagorno-Karabakh 2020 lessons', 'defence press'],
    comms: [uhfVoice('XCC-CAT-SKYSTRIKER')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-AN2DECOY', designation: 'An-2 decoy drones (NK 2020)', short_name: 'An-2 decoy',
    manufacturer: 'COTS conversion', domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'retired', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'combat-proven: Nagorno-Karabakh 2020. Converted An-2 decoys.',
    data_confidence: 'medium', sources: ['OSINT Nagorno-Karabakh 2020 lessons', 'defence press'],
    comms: [uhfVoice('XCC-CAT-AN2DECOY')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-TB2-LESSON', designation: 'TB2 vs legacy SAM lesson', short_name: 'TB2 SAM lesson',
    manufacturer: 'Baykar', domain: 'air', role: 'isr', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'combat-proven: Nagorno-Karabakh 2020; Libya. MALE UAS vs legacy SAM gaps.',
    data_confidence: 'high', sources: ['OSINT Nagorno-Karabakh 2020 lessons', 'defence press'],
    platform_library_id: 'bayraktar-tb2',
    comms: [uhfVoice('XCC-CAT-TB2-LESSON')],
    sensors: [],
  }),
  P({
    id: 'XCC-CAT-LIBYA-DUEL', designation: 'TB2 vs Pantsir duel class', short_name: 'TB2–Pantsir duel',
    manufacturer: null, domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'combat-proven: Libya 2019–20. UAS vs point-AD duel lesson.',
    data_confidence: 'medium', sources: ['OSINT Libya 2019–20'],
    comms: [uhfVoice('XCC-CAT-LIBYA-DUEL')],
    sensors: [],
  }),
]
