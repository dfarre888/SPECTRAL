/**
 * Force Catalogue — Malaysia (MYS).
 * OSINT only. Verified Jul 2026. Neutral Indo-Pacific.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  hfVoice, link16, nationFactory, nationalDatalink, pinnedSensor, satcom, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('MYS', 'Malaysia')
const ndl = (id: string) => nationalDatalink(id, 'Malaysia tactical datalink')

export const MALAYSIA_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'MYS-CAT-SU30', designation: 'Su-30MKM', short_name: 'Su-30MKM',
    manufacturer: 'Sukhoi / Irkut', domain: 'air', role: 'multirole', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2007,
    open_source_summary: 'Primary Flanker multirole.',
    data_confidence: 'high', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [ndl('MYS-CAT-SU30'), uhfVoice('MYS-CAT-SU30')],
    sensors: [pinnedSensor('MYS-CAT-SU30', 'radar', 'N011M Bars', 'X', 'fire-control',
      ['aircraft', 'cruise_missile', 'surface_contacts'], [], 'X-band AESA — descriptive')],
  }),
  P({
    id: 'MYS-CAT-FA18D', designation: 'F/A-18D Hornet', short_name: 'F/A-18D',
    manufacturer: 'Boeing', domain: 'air', role: 'multirole', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1997,
    open_source_summary: 'Hornet remnant.',
    data_confidence: 'medium', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [link16('MYS-CAT-FA18D'), uhfVoice('MYS-CAT-FA18D')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-HAWK', designation: 'Hawk 208', short_name: 'Hawk 208',
    manufacturer: 'BAE', domain: 'air', role: 'multirole', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1994,
    open_source_summary: 'Light attack/trainer.',
    data_confidence: 'medium', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('MYS-CAT-HAWK')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-A400M', designation: 'A400M Atlas', short_name: 'A400M',
    manufacturer: 'Airbus', domain: 'air', role: 'transport', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'Strategic airlift.',
    data_confidence: 'high', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [satcom('MYS-CAT-A400M'), uhfVoice('MYS-CAT-A400M')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-C130', designation: 'C-130H Hercules', short_name: 'C-130H',
    manufacturer: 'Lockheed Martin', domain: 'air', role: 'transport', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1976,
    open_source_summary: 'Tactical airlift.',
    data_confidence: 'medium', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [satcom('MYS-CAT-C130'), uhfVoice('MYS-CAT-C130')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-EC725', designation: 'EC725 / H225M', short_name: 'H225M',
    manufacturer: 'Airbus Helicopters', domain: 'air', role: 'transport', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2012,
    open_source_summary: 'Utility helo.',
    data_confidence: 'medium', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('MYS-CAT-EC725')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-PT91', designation: 'PT-91M Pendekar MBT', short_name: 'PT-91M',
    manufacturer: 'Bumar', domain: 'ground', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2005,
    open_source_summary: 'MBT — small fleet.',
    data_confidence: 'medium', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('MYS-CAT-PT91')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-AV8', designation: 'AV8 Gempita 8×8', short_name: 'AV8',
    manufacturer: 'DefTech / FNSS', domain: 'ground', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2014,
    open_source_summary: 'Wheeled AFV.',
    data_confidence: 'medium', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('MYS-CAT-AV8')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-ASTROS', designation: 'Astros II MLRS', short_name: 'Astros',
    manufacturer: 'Avibras', domain: 'ground', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2002,
    open_source_summary: 'Rocket artillery.',
    data_confidence: 'medium', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('MYS-CAT-ASTROS')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-LEKIU', designation: 'Lekiu-class FFG', short_name: 'Lekiu FFG',
    manufacturer: 'Yarrow / BAE', domain: 'maritime', role: 'maritime_surface', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1999,
    open_source_summary: 'Guided-missile frigates.',
    data_confidence: 'medium', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [link16('MYS-CAT-LEKIU'), uhfVoice('MYS-CAT-LEKIU')],
    sensors: [pinnedSensor('MYS-CAT-LEKIU', 'radar', 'Naval AESA', 'S', 'volume search',
      ['aircraft', 'cruise_missile', 'surface_contacts'], [], 'Naval radar — descriptive')],
  }),
  P({
    id: 'MYS-CAT-KASTURI', designation: 'Kasturi-class FS', short_name: 'Kasturi FS',
    manufacturer: 'Germany / BSC', domain: 'maritime', role: 'maritime_surface', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1984,
    open_source_summary: 'Corvettes modernised.',
    data_confidence: 'medium', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('MYS-CAT-KASTURI')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-SGPV', designation: 'SGPV-LCS Maharaja Lela', short_name: 'Maharaja Lela',
    manufacturer: 'Boustead / Naval Group', domain: 'maritime', role: 'maritime_surface', force_side: 'neutral',
    service_status: 'in_development', program_stage: 'lrip', ioc_year: null,
    open_source_summary: 'Littoral combat ship program — delayed OSINT.',
    data_confidence: 'estimated', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [link16('MYS-CAT-SGPV'), uhfVoice('MYS-CAT-SGPV')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-SCORPENE', designation: 'Scorpène SSK', short_name: 'Scorpène',
    manufacturer: 'Naval Group / BSC', domain: 'maritime', role: 'other', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2009,
    open_source_summary: 'SSK force.',
    data_confidence: 'high', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [hfVoice('MYS-CAT-SCORPENE'), uhfVoice('MYS-CAT-SCORPENE')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-KEDAH', designation: 'Kedah-class MEKO 100 OPV', short_name: 'Kedah OPV',
    manufacturer: 'Blohm+Voss / BSC', domain: 'maritime', role: 'maritime_surface', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2006,
    open_source_summary: 'OPVs.',
    data_confidence: 'medium', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('MYS-CAT-KEDAH')],
    sensors: [],
  }),
  P({
    id: 'MYS-CAT-CTR', designation: 'CTR-UAV / ScanEagle mix', short_name: 'tactical UAS',
    manufacturer: 'mixed', domain: 'air', role: 'isr', force_side: 'neutral',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'Tactical ISR UAS.',
    data_confidence: 'estimated', sources: ['Wikipedia — Malaysian Armed Forces (2026)', 'defence press'],
    comms: [uhfVoice('MYS-CAT-CTR')],
    sensors: [pinnedSensor('MYS-CAT-CTR', 'eo_ir', 'EO/IR', 'IR', 'ISR/targeting',
      ['ground_targets'], [], 'EO/IR — descriptive')],
  }),
]
