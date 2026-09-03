/**
 * Force Catalogue — Philippines (PHL).
 * OSINT only. Verified Jul 2026. Blue Indo-Pacific; Pitch Black partner.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  link16, nationFactory, pinnedSensor, satcom, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('PHL', 'Philippines')

export const PHILIPPINES_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'PHL-CAT-FA50', designation: 'FA-50PH Fighting Eagle', short_name: 'FA-50PH',
    manufacturer: 'KAI', domain: 'air', role: 'multirole', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'Light fighter/attack.',
    data_confidence: 'high', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [link16('PHL-CAT-FA50'), uhfVoice('PHL-CAT-FA50')],
    sensors: [],
  }),
  P({
    id: 'PHL-CAT-S211', designation: 'AS-211 / SF.260 trainers (remnant)', short_name: 'trainers',
    manufacturer: 'mixed', domain: 'air', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1990,
    open_source_summary: 'Trainer/COIN remnant.',
    data_confidence: 'estimated', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [uhfVoice('PHL-CAT-S211')],
    sensors: [],
  }),
  P({
    id: 'PHL-CAT-C130', designation: 'C-130H/T Hercules', short_name: 'C-130',
    manufacturer: 'Lockheed Martin', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1970,
    open_source_summary: 'Airlift — fleet rebuild.',
    data_confidence: 'medium', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [satcom('PHL-CAT-C130'), uhfVoice('PHL-CAT-C130')],
    sensors: [],
  }),
  P({
    id: 'PHL-CAT-C295', designation: 'C-295W', short_name: 'C-295',
    manufacturer: 'Airbus', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'Tactical airlift/MPA path.',
    data_confidence: 'medium', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [satcom('PHL-CAT-C295'), uhfVoice('PHL-CAT-C295')],
    sensors: [],
  }),
  P({
    id: 'PHL-CAT-AW109', designation: 'AW109 / T129 attack mix', short_name: 'AW109/T129',
    manufacturer: 'Leonardo / TAI', domain: 'air', role: 'multirole', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'Armed helicopters.',
    data_confidence: 'medium', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [uhfVoice('PHL-CAT-AW109')],
    sensors: [pinnedSensor('PHL-CAT-AW109', 'eo_ir', 'EO/IR', 'IR', 'ISR/targeting',
      ['ground_targets'], [], 'EO/IR — descriptive')],
  }),
  P({
    id: 'PHL-CAT-S70', designation: 'S-70i Black Hawk', short_name: 'S-70i',
    manufacturer: 'PZL', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'Utility helo modernisation.',
    data_confidence: 'medium', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [uhfVoice('PHL-CAT-S70')],
    sensors: [],
  }),
  P({
    id: 'PHL-CAT-MAXXPRO', designation: 'MaxxPro / APC mix', short_name: 'MaxxPro',
    manufacturer: 'Navistar', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2012,
    open_source_summary: 'MRAP/APC inventory.',
    data_confidence: 'medium', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [uhfVoice('PHL-CAT-MAXXPRO')],
    sensors: [],
  }),
  P({
    id: 'PHL-CAT-ATMOS', designation: 'ATMOS 2000 SPH', short_name: 'ATMOS',
    manufacturer: 'Elbit', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2021,
    open_source_summary: 'Artillery modernisation.',
    data_confidence: 'medium', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [uhfVoice('PHL-CAT-ATMOS')],
    sensors: [],
  }),
  P({
    id: 'PHL-CAT-BRAHMOS', designation: 'BrahMos shore battery', short_name: 'BrahMos PH',
    manufacturer: 'BrahMos Aerospace', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'ordered', program_stage: 'lrip', ioc_year: 2026,
    open_source_summary: 'Shore-based ASCM — deliveries phased.',
    data_confidence: 'medium', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [uhfVoice('PHL-CAT-BRAHMOS')],
    sensors: [],
  }),
  P({
    id: 'PHL-CAT-JOSE', designation: 'Jose Rizal-class FFG', short_name: 'Jose Rizal FFG',
    manufacturer: 'HHI', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'Guided-missile frigates.',
    data_confidence: 'high', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [link16('PHL-CAT-JOSE'), uhfVoice('PHL-CAT-JOSE')],
    sensors: [pinnedSensor('PHL-CAT-JOSE', 'radar', 'NSX radar suite', 'S', 'volume search',
      ['aircraft', 'cruise_missile', 'surface_contacts'], [], 'Naval radar — descriptive')],
  }),
  P({
    id: 'PHL-CAT-MIGUEL', designation: 'Miguel Malvar-class FFG', short_name: 'Miguel Malvar FFG',
    manufacturer: 'HHI', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'ordered', program_stage: 'lrip', ioc_year: 2025,
    open_source_summary: 'Next frigate batch.',
    data_confidence: 'estimated', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [link16('PHL-CAT-MIGUEL'), uhfVoice('PHL-CAT-MIGUEL')],
    sensors: [],
  }),
  P({
    id: 'PHL-CAT-TARLAC', designation: 'Tarlac-class LPD', short_name: 'Tarlac LPD',
    manufacturer: 'PT PAL', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2016,
    open_source_summary: 'Strategic sealift.',
    data_confidence: 'medium', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [uhfVoice('PHL-CAT-TARLAC')],
    sensors: [],
  }),
  P({
    id: 'PHL-CAT-GREGORIO', designation: 'Gregorio del Pilar OPV (Hamilton)', short_name: 'GdP OPV',
    manufacturer: 'USCG transfer', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2011,
    open_source_summary: 'Large OPVs.',
    data_confidence: 'medium', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [link16('PHL-CAT-GREGORIO'), uhfVoice('PHL-CAT-GREGORIO')],
    sensors: [],
  }),
  P({
    id: 'PHL-CAT-SCANEGLE', designation: 'ScanEagle UAS', short_name: 'ScanEagle',
    manufacturer: 'Insitu', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2018,
    open_source_summary: 'Tactical ISR UAS.',
    data_confidence: 'medium', sources: ['Wikipedia — Armed Forces of the Philippines (2026)', 'defence press'],
    comms: [uhfVoice('PHL-CAT-SCANEGLE')],
    sensors: [pinnedSensor('PHL-CAT-SCANEGLE', 'eo_ir', 'EO/IR', 'IR', 'ISR/targeting',
      ['ground_targets'], [], 'EO/IR — descriptive')],
  }),
]
