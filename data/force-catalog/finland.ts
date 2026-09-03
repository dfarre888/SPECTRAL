/**
 * Force Catalogue — Finland (FIN).
 * OSINT only. Verified Jul 2026. Blue NATO (2023+).
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  link16, madl, nationFactory, pinnedSensor, satcom, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('FIN', 'Finland')

export const FINLAND_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'FIN-CAT-F35A', designation: 'F-35A Lightning II', short_name: 'F-35A',
    manufacturer: 'Lockheed Martin', domain: 'air', role: 'multirole', force_side: 'blue',
    service_status: 'ordered', program_stage: 'lrip', ioc_year: 2026,
    open_source_summary: 'HX replacement — deliveries starting.',
    data_confidence: 'medium', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [madl('FIN-CAT-F35A'), link16('FIN-CAT-F35A'), uhfVoice('FIN-CAT-F35A')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-F18', designation: 'F/A-18C/D Hornet', short_name: 'F/A-18C',
    manufacturer: 'Boeing', domain: 'air', role: 'multirole', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1995,
    open_source_summary: 'Legacy Hornets until F-35 IOC.',
    data_confidence: 'high', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [link16('FIN-CAT-F18'), uhfVoice('FIN-CAT-F18')],
    sensors: [pinnedSensor('FIN-CAT-F18', 'radar', 'APG-73', 'X', 'fire-control',
      ['aircraft', 'cruise_missile', 'surface_contacts'], [], 'X-band AESA — descriptive')],
  }),
  P({
    id: 'FIN-CAT-C295', designation: 'C-295M', short_name: 'C-295',
    manufacturer: 'Airbus', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2007,
    open_source_summary: 'Tactical airlift.',
    data_confidence: 'medium', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [satcom('FIN-CAT-C295'), uhfVoice('FIN-CAT-C295')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-NH90', designation: 'NH90', short_name: 'NH90',
    manufacturer: 'NHIndustries', domain: 'air', role: 'transport', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2008,
    open_source_summary: 'Utility helo.',
    data_confidence: 'medium', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [link16('FIN-CAT-NH90'), uhfVoice('FIN-CAT-NH90')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-LEO2', designation: 'Leopard 2A4/A6 FIN', short_name: 'Leopard 2',
    manufacturer: 'KMW', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2003,
    open_source_summary: 'MBT.',
    data_confidence: 'high', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [link16('FIN-CAT-LEO2'), uhfVoice('FIN-CAT-LEO2')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-CV90', designation: 'CV90 IFV', short_name: 'CV90',
    manufacturer: 'BAE Hägglunds', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2002,
    open_source_summary: 'Tracked IFV.',
    data_confidence: 'high', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [link16('FIN-CAT-CV90'), uhfVoice('FIN-CAT-CV90')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-K9', designation: 'K9FIN Thunder', short_name: 'K9',
    manufacturer: 'Hanwha', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2017,
    open_source_summary: 'SPH.',
    data_confidence: 'high', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [uhfVoice('FIN-CAT-K9')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-NASAMS', designation: 'NASAMS', short_name: 'NASAMS',
    manufacturer: 'Kongsberg / Raytheon', domain: 'ground', role: 'radar_ground', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'Medium SAM.',
    data_confidence: 'high', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [link16('FIN-CAT-NASAMS'), uhfVoice('FIN-CAT-NASAMS')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-DAVID', designation: 'David\'s Sling (ordered)', short_name: 'David\'s Sling',
    manufacturer: 'Rafael', domain: 'ground', role: 'radar_ground', force_side: 'blue',
    service_status: 'ordered', program_stage: 'lrip', ioc_year: 2028,
    open_source_summary: 'Upper-tier AMD acquisition.',
    data_confidence: 'estimated', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [link16('FIN-CAT-DAVID'), uhfVoice('FIN-CAT-DAVID')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-HAMINA', designation: 'Hamina-class FAC', short_name: 'Hamina FAC',
    manufacturer: 'Aker / Patria', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 1998,
    open_source_summary: 'Missile FAC — MLU.',
    data_confidence: 'medium', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [link16('FIN-CAT-HAMINA'), uhfVoice('FIN-CAT-HAMINA')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-POHJANMAA', designation: 'Pohjanmaa-class corvette', short_name: 'Pohjanmaa',
    manufacturer: 'Rauma', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_development', program_stage: 'emd', ioc_year: 2027,
    open_source_summary: 'Squadron 2020 corvettes.',
    data_confidence: 'estimated', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [link16('FIN-CAT-POHJANMAA'), uhfVoice('FIN-CAT-POHJANMAA')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-KATANPAA', designation: 'Katanpää-class MHC', short_name: 'Katanpää MHC',
    manufacturer: 'Intermarine', domain: 'maritime', role: 'maritime_surface', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2010,
    open_source_summary: 'Mine countermeasures.',
    data_confidence: 'medium', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [uhfVoice('FIN-CAT-KATANPAA')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-ORION', designation: 'MQ-9 / ISR UAS path', short_name: 'ISR UAS',
    manufacturer: 'mixed', domain: 'air', role: 'isr', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'Tactical/MALE ISR growth.',
    data_confidence: 'estimated', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [satcom('FIN-CAT-ORION'), uhfVoice('FIN-CAT-ORION')],
    sensors: [pinnedSensor('FIN-CAT-ORION', 'eo_ir', 'EO/IR', 'IR', 'ISR/targeting',
      ['ground_targets'], [], 'EO/IR — descriptive')],
  }),

  P({
    id: 'FIN-CAT-GMLRS', designation: 'M270 / GMLRS', short_name: 'GMLRS FIN',
    manufacturer: 'Lockheed Martin', domain: 'ground', role: 'other', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2007,
    open_source_summary: 'MLRS / GMLRS precision rockets.',
    data_confidence: 'medium', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [link16('FIN-CAT-GMLRS'), uhfVoice('FIN-CAT-GMLRS')],
    sensors: [],
  }),
  P({
    id: 'FIN-CAT-ITOHJ', designation: 'ITO 15 / NASAMS batteries', short_name: 'ITO15',
    manufacturer: 'Kongsberg / Raytheon', domain: 'ground', role: 'radar_ground', force_side: 'blue',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'Medium SAM batteries (NASAMS family).',
    data_confidence: 'high', sources: ['Wikipedia — Finnish Defence Forces (2026)', 'defence press'],
    comms: [link16('FIN-CAT-ITOHJ'), uhfVoice('FIN-CAT-ITOHJ')],
    sensors: [],
  }),
]
