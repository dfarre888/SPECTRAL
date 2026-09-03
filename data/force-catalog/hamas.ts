/**
 * Force Catalogue — Hamas / PIJ (HMS).
 * OSINT only. Verified Jul 2026. Non-state red.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  nationFactory, nationalDatalink, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('HMS', 'Hamas / PIJ')
const ndl = (id: string) => nationalDatalink(id, 'Hamas / PIJ tactical datalink')

export const HAMAS_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'HMS-CAT-QASSAM', designation: 'Qassam / Ayyash rocket family', short_name: 'Qassam/Ayyash',
    manufacturer: 'Hamas industry', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2001,
    open_source_summary: 'combat-proven: Gaza through 2023–24. Indigenous rockets.',
    data_confidence: 'medium', sources: ['OSINT Hamas/PIJ reporting 2023–24', 'defence press'],
    comms: [ndl('HMS-CAT-QASSAM'), uhfVoice('HMS-CAT-QASSAM')],
    sensors: [],
  }),
  P({
    id: 'HMS-CAT-ZOUARI', designation: 'Zouari UAV', short_name: 'Zouari',
    manufacturer: 'Hamas industry', domain: 'air', role: 'isr', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2018,
    open_source_summary: 'combat-proven: Gaza. Hamas UAV type.',
    data_confidence: 'estimated', sources: ['OSINT Hamas/PIJ reporting 2023–24', 'defence press'],
    comms: [ndl('HMS-CAT-ZOUARI'), uhfVoice('HMS-CAT-ZOUARI')],
    sensors: [],
  }),
  P({
    id: 'HMS-CAT-TUNNEL', designation: 'Subterranean tunnel network (capability)', short_name: 'Tunnel network',
    manufacturer: 'Hamas', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2000,
    open_source_summary: 'combat-proven: Gaza. Subterranean logistics/C2 — capability class.',
    data_confidence: 'medium', sources: ['OSINT Hamas/PIJ reporting 2023–24', 'defence press'],
    comms: [ndl('HMS-CAT-TUNNEL'), uhfVoice('HMS-CAT-TUNNEL')],
    sensors: [],
  }),
  P({
    id: 'HMS-CAT-AT', designation: 'RPG/ATGM infantry anti-armour mix', short_name: 'AT infantry mix',
    manufacturer: 'mixed', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2000,
    open_source_summary: 'combat-proven: Gaza 2023–24. Mass AT vs armour in urban fight.',
    data_confidence: 'medium', sources: ['OSINT Hamas/PIJ reporting 2023–24', 'defence press'],
    comms: [ndl('HMS-CAT-AT'), uhfVoice('HMS-CAT-AT')],
    sensors: [],
  }),
]
