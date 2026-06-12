/**
 * Conflict Intel case studies — Tier 5 maritime + named engagements.
 * CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

export interface ConflictIncident {
  id: string;
  date: string;
  title: string;
  summary: string;
  actors: string[];
  platforms: string[];
  lesson: string;
  confidence: 'confirmed' | 'assessed' | 'estimated' | 'reported';
  sources: string[];
}

export interface ConflictCaseStudy {
  id: string;
  name: string;
  region: string;
  period: string;
  classification: string;
  summary: string;
  orbat_note: string;
  key_lessons: string[];
  related_platform_ids: string[];
  incidents: ConflictIncident[];
  source_date: string;
}

export const CONFLICT_CASE_STUDIES: ConflictCaseStudy[] = [
  {
    id: 'ukraine-naval-usv',
    name: 'Ukraine Black Sea USV Campaign',
    region: 'Black Sea',
    period: '2023–2026',
    classification: 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
    summary:
      'Ukrainian Magura V5 and baby drone boat USV strikes against Russian naval assets redefined maritime force protection. CIWS magazine depth and RF C2 jamming became decisive factors.',
    orbat_note:
      '~Magura V5 assessed operational with EO-guided terminal strike; baby boat swarms reported in saturation attacks.',
    key_lessons: [
      'HVU protection requires CIWS + soft-kill layered defence — Phalanx alone insufficient vs swarm',
      'USV C2 on SATCOM/Ku-band — EW defeat of datalink degrades terminal guidance',
      'Exchange ratio favours attacker — $200K USV vs $500M frigate',
    ],
    related_platform_ids: ['magura-v5', 'black-sea-usv-swarm'],
    incidents: [
      {
        id: 'magura-kerch-2024',
        date: '2024-05',
        title: 'Magura V5 Kerch Strait area strikes',
        summary: 'Documented USV strikes against Russian Black Sea Fleet support vessels.',
        actors: ['Ukraine GUR', 'Russian Black Sea Fleet'],
        platforms: ['magura-v5'],
        lesson: 'Small USV with 300 kg warhead can mission-kill large surface combatants.',
        confidence: 'assessed',
        sources: ['OSINT: Oryx tracking; Ukrainian MoD releases'],
      },
    ],
    source_date: '2026-06-12',
  },
  {
    id: 'red-sea-hvu',
    name: 'Red Sea HVU Protection — Houthi OWA',
    region: 'Red Sea / Bab el-Mandeb',
    period: '2023–2026',
    classification: 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
    summary:
      'Houthi Samad-family and Shahed-derived OWA-UAV maritime profiles forced coalition naval forces to relearn CIWS magazine management, decoy discrimination, and layered IADS.',
    orbat_note:
      'Samad-2/3 and Shahed-136 variants employed in anti-ship profiles; Gerbera decoy swarms reported to saturate defences.',
    key_lessons: [
      'Naval CIWS (SeaRAM, Goalkeeper) essential but magazine-limited vs saturation',
      'Decoy OWA (Gerbera) wastes interceptor magazines — instructor exchange-ratio drill',
      'GNSS jam reduces OWA accuracy but does not defeat terminal EO variants',
    ],
    related_platform_ids: ['samad-2', 'houthi-owa-maritime', 'shahed-136', 'gerbera-parody'],
    incidents: [
      {
        id: 'red-sea-owa-2024',
        date: '2024-01',
        title: 'OWA-UAV engagements vs coalition HVUs',
        summary: 'Multiple OWA profiles employed against merchant and naval traffic in Red Sea corridor.',
        actors: ['Houthi forces', 'US/UK naval TF'],
        platforms: ['samad-2', 'houthi-owa-maritime', 'shahed-136'],
        lesson: 'Layered naval PD — soft-kill + CIWS + DEW where weather permits.',
        confidence: 'confirmed',
        sources: ['OSINT: US CENTCOM releases; UK MoD statements'],
      },
    ],
    source_date: '2026-06-12',
  },
  {
    id: 'black-sea-usv-swarm',
    name: 'Black Sea USV Swarm Doctrine',
    region: 'Black Sea',
    period: '2024–2026',
    classification: 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
    summary:
      'Assessed emergence of low-cost baby drone boat swarms complementing Magura-class USV strikes — saturation tactic against point-defence systems.',
    orbat_note: 'Estimated dozens of low-signature USV sorties in swarm configurations.',
    key_lessons: [
      'Swarm USV defeats single-channel CIWS — distributed fire required',
      'RF mesh C2 jamming degrades coordinated swarm timing',
      'Kinetic cost-exchange unsustainable without HPM/area effectors',
    ],
    related_platform_ids: ['black-sea-usv-swarm', 'magura-v5'],
    incidents: [],
    source_date: '2026-06-12',
  },
];
