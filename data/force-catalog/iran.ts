/**
 * Force Catalogue — Iran (IRN).
 * OSINT only. Verified Jul 2026. State Red / CRINK — strike systems 2024–26.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  nationFactory, nationalDatalink, pinnedSensor, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('IRN', 'Iran')
const ndl = (id: string) => nationalDatalink(id, 'Iran tactical datalink')

export const IRAN_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'IRN-CAT-KHEIBAR', designation: 'Kheibar Shekan MRBM', short_name: 'Kheibar Shekan',
    manufacturer: 'Iranian industry', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2022,
    open_source_summary: 'combat-proven: Iran–Israel 2024–25. Solid-fuel MRBM.',
    data_confidence: 'medium', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-KHEIBAR'), uhfVoice('IRN-CAT-KHEIBAR')],
    sensors: [],
  }),
  P({
    id: 'IRN-CAT-FATTAH', designation: 'Fattah / Fattah-2 (near-hypersonic claim)', short_name: 'Fattah',
    manufacturer: 'Iranian industry', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'combat-proven: Iran–Israel 2024–25 (claimed). Near-hypersonic claim — estimated/unverified.',
    data_confidence: 'estimated', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-FATTAH'), uhfVoice('IRN-CAT-FATTAH')],
    sensors: [],
  }),
  P({
    id: 'IRN-CAT-EMAD', designation: 'Emad MRBM', short_name: 'Emad',
    manufacturer: 'Iranian industry', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'combat-proven: Iran–Israel 2024–25. Guided Shahab-derived MRBM.',
    data_confidence: 'medium', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-EMAD'), uhfVoice('IRN-CAT-EMAD')],
    sensors: [],
  }),
  P({
    id: 'IRN-CAT-GHADR', designation: 'Ghadr MRBM', short_name: 'Ghadr',
    manufacturer: 'Iranian industry', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'combat-proven: Iran–Israel 2024–25. Liquid MRBM.',
    data_confidence: 'medium', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-GHADR'), uhfVoice('IRN-CAT-GHADR')],
    sensors: [],
  }),
  P({
    id: 'IRN-CAT-SEJJIL', designation: 'Sejjil MRBM', short_name: 'Sejjil',
    manufacturer: 'Iranian industry', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2011,
    open_source_summary: 'combat-proven: Iran–Israel 2024–25 (reported). Solid two-stage MRBM.',
    data_confidence: 'medium', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-SEJJIL'), uhfVoice('IRN-CAT-SEJJIL')],
    sensors: [],
  }),
  P({
    id: 'IRN-CAT-PAVEH', designation: 'Paveh land-attack cruise missile', short_name: 'Paveh',
    manufacturer: 'Iranian industry', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'combat-proven: Iran–Israel 2024–25. Cruise missile with Shahed mixes.',
    data_confidence: 'medium', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-PAVEH'), uhfVoice('IRN-CAT-PAVEH')],
    sensors: [],
  }),
  P({
    id: 'IRN-CAT-ARASH2', designation: 'Arash-2 OWA UAV', short_name: 'Arash-2',
    manufacturer: 'Iranian industry', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2022,
    open_source_summary: 'combat-proven: regional 2022–26. Iranian OWA UAV.',
    data_confidence: 'estimated', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-ARASH2'), uhfVoice('IRN-CAT-ARASH2')],
    sensors: [],
  }),
  P({
    id: 'IRN-CAT-SHAHED136', designation: 'Shahed-136', short_name: 'Shahed-136',
    manufacturer: 'HESA', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2021,
    open_source_summary: 'combat-proven: Ukraine export/Israel–Iran/Red Sea. Primary Iranian OWA.',
    data_confidence: 'high', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    platform_library_id: 'shahed-136',
    comms: [ndl('IRN-CAT-SHAHED136'), uhfVoice('IRN-CAT-SHAHED136')],
    sensors: [],
  }),
  P({
    id: 'IRN-CAT-MOHAJER6', designation: 'Mohajer-6 MALE UAS', short_name: 'Mohajer-6',
    manufacturer: 'Qods Aviation', domain: 'air', role: 'isr', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2018,
    open_source_summary: 'combat-proven: regional/proxy. Armed MALE ISR/strike.',
    data_confidence: 'medium', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-MOHAJER6'), uhfVoice('IRN-CAT-MOHAJER6')],
    sensors: [pinnedSensor('IRN-CAT-MOHAJER6', 'eo_ir', 'EO/IR ISR payload', 'IR', 'ISR/strike',
      ['ground_targets'], [], 'MALE EO/IR — descriptive')],
  }),
  P({
    id: 'IRN-CAT-ABABIL', designation: 'Ababil UAS family', short_name: 'Ababil',
    manufacturer: 'HESA', domain: 'air', role: 'isr', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2000,
    open_source_summary: 'combat-proven: proxy wars. Proliferated tactical UAS.',
    data_confidence: 'medium', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-ABABIL'), uhfVoice('IRN-CAT-ABABIL')],
    sensors: [],
  }),

  P({
    id: 'IRN-CAT-SHADED238', designation: 'Shahed-238 jet OWA (claimed)', short_name: 'Shahed-238',
    manufacturer: 'HESA', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'combat-proven: regional 2024–26 (claimed). Jet Shahed derivative — estimated/unverified details.',
    data_confidence: 'estimated', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-SHADED238'), uhfVoice('IRN-CAT-SHADED238')],
    sensors: [],
  }),
  P({
    id: 'IRN-CAT-BAVAR', designation: 'Bavar-373 SAM', short_name: 'Bavar-373',
    manufacturer: 'Iranian industry', domain: 'ground', role: 'radar_ground', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'Indigenous long-range SAM — S-300-class claim; performance estimated.',
    data_confidence: 'estimated', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-BAVAR'), uhfVoice('IRN-CAT-BAVAR')],
    sensors: [],
  }),
  P({
    id: 'IRN-CAT-HOUTHIEXP', designation: 'Proxy export OWA/ASCM kit class', short_name: 'Proxy export kit',
    manufacturer: 'Iranian industry', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2015,
    open_source_summary: 'combat-proven: Yemen/Red Sea via proxies. Export/facilitation of OWA and coastal AShM kits.',
    data_confidence: 'medium', sources: ['OSINT Iran missile/UAS reporting 2024–26', 'defence press'],
    comms: [ndl('IRN-CAT-HOUTHIEXP'), uhfVoice('IRN-CAT-HOUTHIEXP')],
    sensors: [],
  }),
]
