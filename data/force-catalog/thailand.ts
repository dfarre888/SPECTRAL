/**
 * Force Catalogue — Thailand (THA).
 * OSINT only. Verified Jul 2026. Neutral Indo-Pacific; Pitch Black partner.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  hfVoice, link16, nationFactory, nationalDatalink, pinnedSensor, satcom, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('THA', 'Thailand')
const ndl = (id: string) => nationalDatalink(id, 'Thailand tactical datalink')

export const THAILAND_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'THA-CAT-GRIPEN', designation: 'JAS 39C/D Gripen', short_name: 'Gripen',
    manufacturer: 'Saab', domain: 'air', role: 'multirole', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2011,
    open_source_summary: 'Primary fighter — Erieye networked.',
    data_confidence: 'high', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [link16('THA-CAT-GRIPEN'), uhfVoice('THA-CAT-GRIPEN')],
    sensors: [pinnedSensor('THA-CAT-GRIPEN', 'radar', 'PS-05/A', 'X', 'fire-control',
      ['aircraft', 'cruise_missile', 'surface_contacts'], [], 'X-band AESA — descriptive')],
  }),
  P({
    id: 'THA-CAT-F16', designation: 'F-16A/B Fighting Falcon', short_name: 'F-16',
    manufacturer: 'Lockheed Martin', domain: 'air', role: 'multirole', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1988,
    open_source_summary: 'Legacy Vipers.',
    data_confidence: 'medium', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [link16('THA-CAT-F16'), uhfVoice('THA-CAT-F16')],
    sensors: [],
  }),
  P({
    id: 'THA-CAT-SAAB340', designation: 'S 100B Argus Erieye AEW', short_name: 'Erieye',
    manufacturer: 'Saab', domain: 'air', role: 'aew_c', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2011,
    open_source_summary: 'AEW&C.',
    data_confidence: 'high', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [link16('THA-CAT-SAAB340', true), satcom('THA-CAT-SAAB340'), uhfVoice('THA-CAT-SAAB340')],
    sensors: [pinnedSensor('THA-CAT-SAAB340', 'radar', 'Erieye', 'S', 'airborne early warning',
      ['aircraft', 'cruise_missile'], ['small_uas'], 'AEW — descriptive')],
  }),
  P({
    id: 'THA-CAT-C130', designation: 'C-130H Hercules', short_name: 'C-130H',
    manufacturer: 'Lockheed Martin', domain: 'air', role: 'transport', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1980,
    open_source_summary: 'Airlift.',
    data_confidence: 'medium', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [satcom('THA-CAT-C130'), uhfVoice('THA-CAT-C130')],
    sensors: [],
  }),
  P({
    id: 'THA-CAT-VT4', designation: 'VT-4 MBT', short_name: 'VT-4',
    manufacturer: 'Norinco', domain: 'ground', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2017,
    open_source_summary: 'Chinese MBT.',
    data_confidence: 'medium', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [ndl('THA-CAT-VT4'), uhfVoice('THA-CAT-VT4')],
    sensors: [],
  }),
  P({
    id: 'THA-CAT-T84', designation: 'T-84 Oplot MBT', short_name: 'T-84 Oplot',
    manufacturer: 'KMDB', domain: 'ground', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2014,
    open_source_summary: 'Ukrainian MBT remnant.',
    data_confidence: 'medium', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [ndl('THA-CAT-T84'), uhfVoice('THA-CAT-T84')],
    sensors: [],
  }),
  P({
    id: 'THA-CAT-BTR', designation: 'BTR-3E1 APC', short_name: 'BTR-3',
    manufacturer: 'KMDB', domain: 'ground', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2010,
    open_source_summary: 'Ukrainian wheeled APC.',
    data_confidence: 'medium', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('THA-CAT-BTR')],
    sensors: [],
  }),
  P({
    id: 'THA-CAT-ATMOS', designation: 'ATMOS 2000 SPH', short_name: 'ATMOS',
    manufacturer: 'Elbit', domain: 'ground', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'Truck SPH.',
    data_confidence: 'medium', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('THA-CAT-ATMOS')],
    sensors: [],
  }),
  P({
    id: 'THA-CAT-Naresuan', designation: 'Naresuan-class FFG', short_name: 'Naresuan FFG',
    manufacturer: 'CSIC / RTN', domain: 'maritime', role: 'maritime_surface', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1994,
    open_source_summary: 'Guided-missile frigates.',
    data_confidence: 'medium', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [link16('THA-CAT-Naresuan'), uhfVoice('THA-CAT-Naresuan')],
    sensors: [pinnedSensor('THA-CAT-Naresuan', 'radar', 'Naval AESA', 'S', 'volume search',
      ['aircraft', 'cruise_missile', 'surface_contacts'], [], 'Naval radar — descriptive')],
  }),
  P({
    id: 'THA-CAT-Bhumibol', designation: 'Bhumibol Adulyadej-class FFG', short_name: 'Bhumibol FFG',
    manufacturer: 'DSME', domain: 'maritime', role: 'maritime_surface', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'Korean-designed frigate.',
    data_confidence: 'high', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [link16('THA-CAT-Bhumibol'), uhfVoice('THA-CAT-Bhumibol')],
    sensors: [],
  }),
  P({
    id: 'THA-CAT-T214', designation: 'Type 209/1400 SSK (status)', short_name: 'Type 209 THA',
    manufacturer: 'TKMS', domain: 'maritime', role: 'other', force_side: 'neutral',
    service_status: 'ordered', program_stage: 'lrip', ioc_year: null,
    open_source_summary: 'SSK program — political/funding delays OSINT.',
    data_confidence: 'estimated', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [hfVoice('THA-CAT-T214'), uhfVoice('THA-CAT-T214')],
    sensors: [],
  }),
  P({
    id: 'THA-CAT-OPV', designation: 'Krabi / Hua Hin OPV', short_name: 'OPV',
    manufacturer: 'Bangkok Dock / BAES', domain: 'maritime', role: 'maritime_surface', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2013,
    open_source_summary: 'Offshore patrol.',
    data_confidence: 'medium', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('THA-CAT-OPV')],
    sensors: [],
  }),
  P({
    id: 'THA-CAT-AH1Z', designation: 'AH-1Z Viper', short_name: 'AH-1Z',
    manufacturer: 'Bell', domain: 'air', role: 'multirole', force_side: 'neutral',
    service_status: 'ordered', program_stage: 'lrip', ioc_year: 2026,
    open_source_summary: 'Attack helo acquisition.',
    data_confidence: 'estimated', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [link16('THA-CAT-AH1Z'), uhfVoice('THA-CAT-AH1Z')],
    sensors: [],
  }),
  P({
    id: 'THA-CAT-S70', designation: 'S-70i Black Hawk', short_name: 'S-70i',
    manufacturer: 'PZL / Sikorsky', domain: 'air', role: 'transport', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2011,
    open_source_summary: 'Utility helicopter.',
    data_confidence: 'medium', sources: ['Wikipedia — Royal Thai Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('THA-CAT-S70')],
    sensors: [],
  }),
]
