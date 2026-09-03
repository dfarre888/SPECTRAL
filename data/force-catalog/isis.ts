/**
 * Force Catalogue — ISIS (historical) (ISI).
 * OSINT only. Verified Jul 2026. Non-state red historical precedent.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  nationFactory, nationalDatalink, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('ISI', 'ISIS (historical)')
const ndl = (id: string) => nationalDatalink(id, 'ISIS (historical) tactical datalink')

export const ISIS_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'ISI-CAT-COTS-BOMB', designation: 'COTS quadcopter bomblet UAS', short_name: 'ISIS COTS UAS',
    manufacturer: 'COTS', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'retired', program_stage: 'fielded', ioc_year: 2016,
    open_source_summary: 'combat-proven: Mosul 2016–17. Commercial quadcopters dropping bomblets.',
    data_confidence: 'medium', sources: ['OSINT ISIS COTS UAS precedent', 'defence press'],
    comms: [uhfVoice('ISI-CAT-COTS-BOMB')],
    sensors: [],
  }),
  P({
    id: 'ISI-CAT-VBIED', designation: 'VBIED / SVBIED class', short_name: 'VBIED',
    manufacturer: 'improvised', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'retired', program_stage: 'fielded', ioc_year: 2014,
    open_source_summary: 'combat-proven: Iraq/Syria. Vehicle-borne IEDs as mass assault weapon.',
    data_confidence: 'medium', sources: ['OSINT ISIS COTS UAS precedent', 'defence press'],
    comms: [uhfVoice('ISI-CAT-VBIED')],
    sensors: [],
  }),
  P({
    id: 'ISI-CAT-DRONE-ISR', designation: 'COTS ISR quadcopter', short_name: 'ISIS ISR COTS',
    manufacturer: 'COTS', domain: 'air', role: 'isr', force_side: 'red',
    service_status: 'retired', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'combat-proven: Iraq/Syria. Commercial ISR drones.',
    data_confidence: 'medium', sources: ['OSINT ISIS COTS UAS precedent', 'defence press'],
    comms: [uhfVoice('ISI-CAT-DRONE-ISR')],
    sensors: [],
  }),
]
