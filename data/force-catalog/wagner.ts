/**
 * Force Catalogue — Wagner / Africa Corps (WAG).
 * OSINT only. Verified Jul 2026. Non-state red PMC.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  nationFactory, nationalDatalink, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('WAG', 'Wagner / Africa Corps')
const ndl = (id: string) => nationalDatalink(id, 'Wagner / Africa Corps tactical datalink')

export const WAGNER_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'WAG-CAT-EXP-ARMOUR', designation: 'Expeditionary armour mix (T-72/BMP)', short_name: 'WAG armour',
    manufacturer: 'Russian origin', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'combat-proven: Ukraine/Syria/Africa. PMC armour detachments.',
    data_confidence: 'medium', sources: ['OSINT Wagner/Africa Corps reporting', 'defence press'],
    comms: [ndl('WAG-CAT-EXP-ARMOUR'), uhfVoice('WAG-CAT-EXP-ARMOUR')],
    sensors: [],
  }),
  P({
    id: 'WAG-CAT-UAS', designation: 'Tactical UAS (Orlan/FPV mix)', short_name: 'WAG UAS',
    manufacturer: 'Russian/COTS', domain: 'air', role: 'isr', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2018,
    open_source_summary: 'combat-proven: Ukraine/Africa. PMC tactical UAS/FPV.',
    data_confidence: 'medium', sources: ['OSINT Wagner/Africa Corps reporting', 'defence press'],
    comms: [ndl('WAG-CAT-UAS'), uhfVoice('WAG-CAT-UAS')],
    sensors: [],
  }),
  P({
    id: 'WAG-CAT-ART', designation: 'Towed/SP artillery detachment', short_name: 'WAG artillery',
    manufacturer: 'Russian origin', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'combat-proven: Ukraine/Africa. Expeditionary fires.',
    data_confidence: 'estimated', sources: ['OSINT Wagner/Africa Corps reporting', 'defence press'],
    comms: [ndl('WAG-CAT-ART'), uhfVoice('WAG-CAT-ART')],
    sensors: [],
  }),
  P({
    id: 'WAG-CAT-AIR', designation: 'Contract air (Su-24/25/Mi-24 mix)', short_name: 'WAG contract air',
    manufacturer: 'Russian origin', domain: 'air', role: 'multirole', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2018,
    open_source_summary: 'combat-proven: Libya/Africa. Contract combat air.',
    data_confidence: 'estimated', sources: ['OSINT Wagner/Africa Corps reporting', 'defence press'],
    comms: [ndl('WAG-CAT-AIR'), uhfVoice('WAG-CAT-AIR')],
    sensors: [],
  }),
]
