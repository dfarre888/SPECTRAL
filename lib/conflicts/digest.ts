/** Curated OSINT conflict digest rows */
export type DigestConfidence = 'Confirmed' | 'Assessed' | 'Estimated' | 'Reported';

export interface ConflictDigestEntry {
  id: string;
  title: string;
  sourceDate: string;
  confidence: DigestConfidence;
  employmentPattern: string;
  countermeasure: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const CONFLICT_DIGEST: ConflictDigestEntry[] = [
  {
    id: 'ukraine-shahed-2026',
    title: 'Shahed-136 saturation — southern axis',
    sourceDate: '2026-03-15',
    confidence: 'Assessed',
    employmentPattern: 'Mixed Shahed/cruise salvo at 02:00–04:00 local; terrain-masked ingress at 80–150m AGL.',
    countermeasure: 'Layered Gepard + NASAMS; RF defeat ineffective vs INS+GPS variants.',
    threatLevel: 'MEDIUM',
  },
  {
    id: 'red-sea-owa-2026',
    title: 'Houthi OWA-UAV maritime strike',
    sourceDate: '2026-02-20',
    confidence: 'Confirmed',
    employmentPattern: 'Low-altitude sea-skimming OWA against commercial shipping lanes.',
    countermeasure: 'CIWS + EW; kinetic exchange unfavourable vs cost.',
    threatLevel: 'HIGH',
  },
];
