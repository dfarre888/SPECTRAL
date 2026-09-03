/**
 * Force Catalogue — Papua New Guinea (PNG).
 * OSINT only. Verified Jul 2026. Thin OrBat; Australia security partner.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  nationFactory, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('PNG', 'Papua New Guinea')

export const PNG_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'PNG-CAT-PACIFIC', designation: 'Guardian-class patrol boat', short_name: 'Guardian PB',
    manufacturer: 'Austal / ADF gift', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2018,
    open_source_summary: 'Pacific patrol boats — maritime security.',
    data_confidence: 'medium', sources: ['Wikipedia — PNGDF (2026)', 'defence press / ADF partnership OSINT'],
    comms: [uhfVoice('PNG-CAT-PACIFIC')],
    sensors: [],
  }),
  P({
    id: 'PNG-CAT-LAND', designation: 'LandRover / light utility fleet', short_name: 'Light utility',
    manufacturer: 'mixed', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2000,
    open_source_summary: 'Light land mobility — thin inventory.',
    data_confidence: 'estimated', sources: ['Wikipedia — PNGDF (2026)', 'defence press / ADF partnership OSINT'],
    comms: [uhfVoice('PNG-CAT-LAND')],
    sensors: [],
  }),
  P({
    id: 'PNG-CAT-AIR', designation: 'CN-235 / light airlift (status thin)', short_name: 'Light airlift',
    manufacturer: 'mixed', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1990,
    open_source_summary: 'Limited air mobility — OSINT thin.',
    data_confidence: 'estimated', sources: ['Wikipedia — PNGDF (2026)', 'defence press / ADF partnership OSINT'],
    comms: [uhfVoice('PNG-CAT-AIR')],
    sensors: [],
  }),
]
