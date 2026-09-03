/**
 * Force Catalogue — Conflict Theatre Lessons (XTH).
 * OSINT only. Verified Jul 2026. Thin C3 theatre lessons (NK 2020 covered in XCC; Sindoor tags on IND/PAK munitions).
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  nationFactory, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('XTH', 'Conflict Theatre Lessons')

export const CONFLICT_THEATRES_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'XTH-CAT-LIBYA-TB2', designation: 'Libya 2019–20 TB2 employment class', short_name: 'Libya TB2',
    manufacturer: 'Baykar / GNA', domain: 'air', role: 'isr', force_side: 'neutral',
    service_status: 'retired', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'combat-proven: Libya 2019–20. MALE UAS vs Pantsir duel; expeditionary UAS airpower lesson.',
    data_confidence: 'medium', sources: ['OSINT multi-theatre conflict lessons 2011–26', 'defence press'],
    platform_library_id: 'bayraktar-tb2',
    comms: [uhfVoice('XTH-CAT-LIBYA-TB2')],
    sensors: [],
  }),
  P({
    id: 'XTH-CAT-SYRIA-UAS', designation: 'Syria theatre UAS mix (state/proxy)', short_name: 'Syria UAS mix',
    manufacturer: 'mixed', domain: 'air', role: 'isr', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'combat-proven: Syria 2015–24. State + proxy tactical UAS/loitering saturation.',
    data_confidence: 'medium', sources: ['OSINT multi-theatre conflict lessons 2011–26', 'defence press'],
    comms: [uhfVoice('XTH-CAT-SYRIA-UAS')],
    sensors: [],
  }),
  P({
    id: 'XTH-CAT-SYRIA-SAA', designation: 'Syrian Arab Army legacy AD gap class', short_name: 'SAA AD gap',
    manufacturer: null, domain: 'ground', role: 'radar_ground', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2011,
    open_source_summary: 'combat-proven: Syria. Legacy SAM density vs modern UAS/cruise — gap lesson.',
    data_confidence: 'estimated', sources: ['OSINT multi-theatre conflict lessons 2011–26', 'defence press'],
    comms: [uhfVoice('XTH-CAT-SYRIA-SAA')],
    sensors: [],
  }),
  P({
    id: 'XTH-CAT-ETH-TIGRAY', designation: 'Ethiopia Tigray COTS/FPV class', short_name: 'Tigray COTS UAS',
    manufacturer: 'COTS', domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'retired', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'combat-proven: Ethiopia Tigray 2020–22. COTS drones in civil conflict ISR/strike.',
    data_confidence: 'estimated', sources: ['OSINT multi-theatre conflict lessons 2011–26', 'defence press'],
    comms: [uhfVoice('XTH-CAT-ETH-TIGRAY')],
    sensors: [],
  }),
  P({
    id: 'XTH-CAT-SUDAN-COTS', designation: 'Sudan civil war COTS UAS class', short_name: 'Sudan COTS UAS',
    manufacturer: 'COTS', domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'combat-proven: Sudan 2023–26. Commercial UAS in urban civil war.',
    data_confidence: 'estimated', sources: ['OSINT multi-theatre conflict lessons 2011–26', 'defence press'],
    comms: [uhfVoice('XTH-CAT-SUDAN-COTS')],
    sensors: [],
  }),
  P({
    id: 'XTH-CAT-SUDAN-RPV', designation: 'Sudan RSF/SAF armed RPV class', short_name: 'Sudan armed RPV',
    manufacturer: 'mixed', domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'combat-proven: Sudan 2023–26. Armed RPV/loitering reported both sides.',
    data_confidence: 'estimated', sources: ['OSINT multi-theatre conflict lessons 2011–26', 'defence press'],
    comms: [uhfVoice('XTH-CAT-SUDAN-RPV')],
    sensors: [],
  }),
  P({
    id: 'XTH-CAT-NK2020-DECOY', designation: 'NK 2020 decoy saturation class', short_name: 'NK decoy class',
    manufacturer: 'converted', domain: 'air', role: 'other', force_side: 'neutral',
    service_status: 'retired', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'combat-proven: Nagorno-Karabakh 2020. Decoy aircraft to exhaust AD magazines.',
    data_confidence: 'medium', sources: ['OSINT multi-theatre conflict lessons 2011–26', 'defence press'],
    comms: [uhfVoice('XTH-CAT-NK2020-DECOY')],
    sensors: [],
  }),
  P({
    id: 'XTH-CAT-YEMEN-PROXY', designation: 'Yemen proxy ASCM/OWA class', short_name: 'Yemen proxy strike',
    manufacturer: 'Iranian-derived', domain: 'maritime', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2016,
    open_source_summary: 'combat-proven: Yemen/Red Sea 2016–26. Proxy coastal AShM + OWA model (see HOU catalog).',
    data_confidence: 'medium', sources: ['OSINT multi-theatre conflict lessons 2011–26', 'defence press'],
    comms: [uhfVoice('XTH-CAT-YEMEN-PROXY')],
    sensors: [],
  }),
]
