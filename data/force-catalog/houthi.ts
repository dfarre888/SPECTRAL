/**
 * Force Catalogue — Ansar Allah (Houthi) (HOU).
 * OSINT only. Verified Jul 2026. Non-state Red Sea threat.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY.
 */

import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  nationFactory, nationalDatalink, uhfVoice,
} from '@/data/force-catalog/_helpers'


const P = nationFactory('HOU', 'Ansar Allah (Houthi)')
const ndl = (id: string) => nationalDatalink(id, 'Ansar Allah (Houthi) tactical datalink')

export const HOUTHI_CATALOG: ForceCatalogPlatformFull[] = [

  P({
    id: 'HOU-CAT-PALESTINE2', designation: 'Palestine-2 ballistic (claimed hypersonic)', short_name: 'Palestine-2',
    manufacturer: 'Iranian-derived / HOU', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'combat-proven: Red Sea 2024–26. Houthi ballistic; hypersonic claim unverified.',
    data_confidence: 'estimated', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-PALESTINE2'), uhfVoice('HOU-CAT-PALESTINE2')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-TANKEEL', designation: 'Tankeel ballistic missile', short_name: 'Tankeel',
    manufacturer: 'HOU / Iranian-derived', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'combat-proven: Red Sea 2023–26. Houthi ballistic family.',
    data_confidence: 'estimated', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-TANKEEL'), uhfVoice('HOU-CAT-TANKEEL')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-TOOPHAN', designation: 'Toophan ballistic missile', short_name: 'Toophan',
    manufacturer: 'HOU / Iranian-derived', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2023,
    open_source_summary: 'combat-proven: Red Sea 2023–26. Houthi ballistic variant.',
    data_confidence: 'estimated', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-TOOPHAN'), uhfVoice('HOU-CAT-TOOPHAN')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-AQEEL', designation: 'Aqeel ballistic missile', short_name: 'Aqeel',
    manufacturer: 'HOU / Iranian-derived', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2024,
    open_source_summary: 'combat-proven: Red Sea 2024–26. Houthi ballistic type.',
    data_confidence: 'estimated', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-AQEEL'), uhfVoice('HOU-CAT-AQEEL')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-ZULFIQAR', designation: 'Zulfiqar ballistic missile', short_name: 'Zulfiqar',
    manufacturer: 'HOU / Iranian-derived', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2017,
    open_source_summary: 'combat-proven: Yemen/Red Sea. Longer-range Houthi ballistic.',
    data_confidence: 'medium', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-ZULFIQAR'), uhfVoice('HOU-CAT-ZULFIQAR')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-ALMANDAB2', designation: 'Al-Mandab-2 ASCM', short_name: 'Al-Mandab-2',
    manufacturer: 'HOU / Iranian-derived', domain: 'maritime', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2017,
    open_source_summary: 'combat-proven: Red Sea 2016–26. Coastal anti-ship cruise missile.',
    data_confidence: 'medium', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-ALMANDAB2'), uhfVoice('HOU-CAT-ALMANDAB2')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-SAYYAD', designation: 'Sayyad ASCM/coastal', short_name: 'Sayyad',
    manufacturer: 'HOU / Iranian-derived', domain: 'maritime', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2018,
    open_source_summary: 'combat-proven: Red Sea. Coastal AShM family.',
    data_confidence: 'estimated', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-SAYYAD'), uhfVoice('HOU-CAT-SAYYAD')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-QUDS', designation: 'Quds cruise-missile family', short_name: 'Quds CM',
    manufacturer: 'HOU / Iranian-derived', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'combat-proven: Red Sea/Saudi strikes. Land-attack cruise missile family.',
    data_confidence: 'medium', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-QUDS'), uhfVoice('HOU-CAT-QUDS')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-SAMAD', designation: 'Samad-1/2/3 OWA UAV', short_name: 'Samad',
    manufacturer: 'HOU', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2018,
    open_source_summary: 'combat-proven: Yemen/Red Sea. Houthi long-endurance OWA UAV.',
    data_confidence: 'medium', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-SAMAD'), uhfVoice('HOU-CAT-SAMAD')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-QASEF', designation: 'Qasef-1/2K OWA UAV', short_name: 'Qasef',
    manufacturer: 'HOU / Iranian-derived', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2016,
    open_source_summary: 'combat-proven: Yemen. Ababil-derived OWA.',
    data_confidence: 'medium', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-QASEF'), uhfVoice('HOU-CAT-QASEF')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-WAID', designation: 'Wa\'id OWA UAV', short_name: 'Wa\'id',
    manufacturer: 'HOU / Iranian-derived', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'combat-proven: Red Sea 2023–26. Shahed-related OWA.',
    data_confidence: 'estimated', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-WAID'), uhfVoice('HOU-CAT-WAID')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-BARQ', designation: 'Barq / Blowfish explosive USV', short_name: 'Barq USV',
    manufacturer: 'HOU / Iranian-derived', domain: 'maritime', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'combat-proven: Red Sea 2019–26. Explosive drone boats.',
    data_confidence: 'medium', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    platform_library_id: 'houthi-barq-1',
    comms: [ndl('HOU-CAT-BARQ'), uhfVoice('HOU-CAT-BARQ')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-SHAHED136', designation: 'Shahed-136 (HOU)', short_name: 'Shahed-136 HOU',
    manufacturer: 'HESA / HOU', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2022,
    open_source_summary: 'combat-proven: Red Sea 2023–26. Iranian-origin OWA.',
    data_confidence: 'high', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    platform_library_id: 'shahed-136',
    comms: [ndl('HOU-CAT-SHAHED136'), uhfVoice('HOU-CAT-SHAHED136')],
    sensors: [],
  }),

  P({
    id: 'HOU-CAT-BADR', designation: 'Badr ballistic / PGM family', short_name: 'Badr',
    manufacturer: 'HOU / Iranian-derived', domain: 'ground', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2019,
    open_source_summary: 'combat-proven: Yemen/Red Sea. Houthi ballistic/PGM family.',
    data_confidence: 'estimated', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-BADR'), uhfVoice('HOU-CAT-BADR')],
    sensors: [],
  }),
  P({
    id: 'HOU-CAT-KARAR', designation: 'Karrar / jet UCAV (HOU)', short_name: 'Karrar HOU',
    manufacturer: 'Iranian-origin', domain: 'air', role: 'other', force_side: 'red',
    service_status: 'in_service', program_stage: 'fielded', ioc_year: 2020,
    open_source_summary: 'combat-proven: Red Sea (reported). Jet UCAV/OWA-capable type.',
    data_confidence: 'estimated', sources: ['OSINT Red Sea / Houthi reporting 2023–26', 'defence press'],
    comms: [ndl('HOU-CAT-KARAR'), uhfVoice('HOU-CAT-KARAR')],
    sensors: [],
  }),
]
