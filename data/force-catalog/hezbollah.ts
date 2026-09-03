/**
 * Force Catalogue — Hezbollah (HEZ).
 * OSINT only. Verified Jul 2026. Non-state red.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  nationFactory, nationalDatalink, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('HEZ', 'Hezbollah')
const ndl = (id: string) => nationalDatalink(id, 'Hezbollah tactical datalink')

export const HEZBOLLAH_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'HEZ-CAT-ABABIL', designation: 'Ababil UAV (HEZ)', short_name: 'Ababil HEZ',
    manufacturer: 'Iranian-origin', domain: 'air', role: 'isr', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2006,
    open_source_summary: 'combat-proven: 2006/2023–26 Lebanon. Tactical UAV.',
    data_confidence: 'medium', sources: ['OSINT Hezbollah capability reporting 2023–26', 'defence press'],
    comms: [ndl('HEZ-CAT-ABABIL'), uhfVoice('HEZ-CAT-ABABIL')],
    sensors: [],
  }),
  P({
    id: 'HEZ-CAT-KARRAR', designation: 'Karrar UCAV', short_name: 'Karrar',
    manufacturer: 'Iranian-origin', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2010,
    open_source_summary: 'combat-proven: regional. Jet UCAV/OWA-capable type.',
    data_confidence: 'estimated', sources: ['OSINT Hezbollah capability reporting 2023–26', 'defence press'],
    comms: [ndl('HEZ-CAT-KARRAR'), uhfVoice('HEZ-CAT-KARRAR')],
    sensors: [],
  }),
  P({
    id: 'HEZ-CAT-PRECISION', designation: 'Precision guided rockets (HEZ)', short_name: 'PG rockets HEZ',
    manufacturer: 'Iranian/HEZ', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'combat-proven: 2023–26. Guidance kits on medium rockets.',
    data_confidence: 'medium', sources: ['OSINT Hezbollah capability reporting 2023–26', 'defence press'],
    comms: [ndl('HEZ-CAT-PRECISION'), uhfVoice('HEZ-CAT-PRECISION')],
    sensors: [],
  }),
  P({
    id: 'HEZ-CAT-ASHM', designation: 'Coastal AShM (HEZ)', short_name: 'Coastal AShM HEZ',
    manufacturer: 'Iranian-origin', domain: 'maritime', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2006,
    open_source_summary: 'combat-proven: 2006 INS Hanit / retained coastal AShM.',
    data_confidence: 'medium', sources: ['OSINT Hezbollah capability reporting 2023–26', 'defence press'],
    comms: [ndl('HEZ-CAT-ASHM'), uhfVoice('HEZ-CAT-ASHM')],
    sensors: [],
  }),
  P({
    id: 'HEZ-CAT-FATAH110', designation: 'Fateh-110 / M-600 class', short_name: 'Fateh-110 HEZ',
    manufacturer: 'Iranian-origin', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2010,
    open_source_summary: 'combat-proven: 2023–26. Solid SRBM/rocket family.',
    data_confidence: 'medium', sources: ['OSINT Hezbollah capability reporting 2023–26', 'defence press'],
    comms: [ndl('HEZ-CAT-FATAH110'), uhfVoice('HEZ-CAT-FATAH110')],
    sensors: [],
  }),
]
