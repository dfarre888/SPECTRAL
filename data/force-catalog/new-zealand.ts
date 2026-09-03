/**
 * Force Catalogue — New Zealand (NZL).
 * OSINT only. Verified Jul 2026. Blue Five Eyes.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  link16, nationFactory, pinnedSensor, satcom, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('NZL', 'New Zealand')

export const NEW_ZEALAND_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'NZL-CAT-P8A', designation: 'P-8A Poseidon', short_name: 'P-8A',
    manufacturer: 'Boeing', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'MPA/ASW replacing P-3K2.',
    data_confidence: 'high', sources: ['Wikipedia — NZDF (2026)', 'defence press'],
    comms: [link16('NZL-CAT-P8A'), satcom('NZL-CAT-P8A'), uhfVoice('NZL-CAT-P8A')],
    sensors: [],
  }),
  P({
    id: 'NZL-CAT-C130J', designation: 'C-130J-30 Super Hercules', short_name: 'C-130J',
    manufacturer: 'Lockheed Martin', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'Tactical airlift replacement.',
    data_confidence: 'high', sources: ['Wikipedia — NZDF (2026)', 'defence press'],
    comms: [satcom('NZL-CAT-C130J'), uhfVoice('NZL-CAT-C130J')],
    sensors: [],
  }),
  P({
    id: 'NZL-CAT-B757', designation: 'Boeing 757 strategic airlift', short_name: 'B757',
    manufacturer: 'Boeing', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2003,
    open_source_summary: 'Strategic transport (aging).',
    data_confidence: 'medium', sources: ['Wikipedia — NZDF (2026)', 'defence press'],
    comms: [satcom('NZL-CAT-B757'), uhfVoice('NZL-CAT-B757')],
    sensors: [],
  }),
  P({
    id: 'NZL-CAT-NH90', designation: 'NH90', short_name: 'NH90',
    manufacturer: 'NHIndustries', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2012,
    open_source_summary: 'Utility helicopter.',
    data_confidence: 'medium', sources: ['Wikipedia — NZDF (2026)', 'defence press'],
    comms: [link16('NZL-CAT-NH90'), uhfVoice('NZL-CAT-NH90')],
    sensors: [],
  }),
  P({
    id: 'NZL-CAT-SH2G', designation: 'SH-2G(I) Seasprite', short_name: 'Seasprite',
    manufacturer: 'Kaman', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2011,
    open_source_summary: 'Naval helicopter.',
    data_confidence: 'medium', sources: ['Wikipedia — NZDF (2026)', 'defence press'],
    comms: [link16('NZL-CAT-SH2G'), uhfVoice('NZL-CAT-SH2G')],
    sensors: [],
  }),
  P({
    id: 'NZL-CAT-ANZAC', designation: 'Anzac-class FFH', short_name: 'Anzac FFH',
    manufacturer: 'Tenix / MEKO', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1997,
    open_source_summary: 'Frigates — midlife upgrades.',
    data_confidence: 'high', sources: ['Wikipedia — NZDF (2026)', 'defence press'],
    comms: [link16('NZL-CAT-ANZAC'), uhfVoice('NZL-CAT-ANZAC')],
    sensors: [pinnedSensor('NZL-CAT-ANZAC', 'radar', 'SMART-S', 'S', 'volume search',
      ['aircraft', 'cruise_missile', 'surface_contacts'], [], 'Naval radar — descriptive')],
  }),
  P({
    id: 'NZL-CAT-OPV', designation: 'Otago / Wellington OPV', short_name: 'OPV',
    manufacturer: 'BAES Australia', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2010,
    open_source_summary: 'Offshore patrol.',
    data_confidence: 'medium', sources: ['Wikipedia — NZDF (2026)', 'defence press'],
    comms: [uhfVoice('NZL-CAT-OPV')],
    sensors: [],
  }),
  P({
    id: 'NZL-CAT-CANTERBURY', designation: 'HMNZS Canterbury MRV', short_name: 'Canterbury MRV',
    manufacturer: 'Merwede', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2007,
    open_source_summary: 'Sealift/amphibious.',
    data_confidence: 'medium', sources: ['Wikipedia — NZDF (2026)', 'defence press'],
    comms: [uhfVoice('NZL-CAT-CANTERBURY')],
    sensors: [],
  }),
  P({
    id: 'NZL-CAT-LAV', designation: 'NZLAV III', short_name: 'NZLAV',
    manufacturer: 'GDLS', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2003,
    open_source_summary: 'Wheeled AFV.',
    data_confidence: 'medium', sources: ['Wikipedia — NZDF (2026)', 'defence press'],
    comms: [uhfVoice('NZL-CAT-LAV')],
    sensors: [],
  }),
  P({
    id: 'NZL-CAT-PINZG', designation: 'Pinzgauer / special ops mobility', short_name: 'Pinzgauer',
    manufacturer: 'mixed', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2004,
    open_source_summary: 'Light mobility.',
    data_confidence: 'estimated', sources: ['Wikipedia — NZDF (2026)', 'defence press'],
    comms: [uhfVoice('NZL-CAT-PINZG')],
    sensors: [],
  }),
  P({
    id: 'NZL-CAT-FRIGATEREPL', designation: 'Frigate replacement (program)', short_name: 'FFG replacement',
    manufacturer: 'TBD', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'concept', program_stage: 'announced', ioc_year: null,
    open_source_summary: 'Anzac replacement pathway — early.',
    data_confidence: 'estimated', sources: ['Wikipedia — NZDF (2026)', 'defence press'],
    comms: [link16('NZL-CAT-FRIGATEREPL'), uhfVoice('NZL-CAT-FRIGATEREPL')],
    sensors: [],
  }),
]
