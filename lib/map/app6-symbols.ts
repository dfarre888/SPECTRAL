/** APP-6 / MIL-STD-2525 SIDC strings (v1 text fallback + billboard key) */
export type App6Force = 'friendly' | 'hostile' | 'neutral' | 'unknown';
export type App6Category = 'uas' | 'radar' | 'sam' | 'cuas' | 'effector';

const SIDCS: Record<string, string> = {
  'uas-hostile': 'SUAPMF----*****',
  'uas-friendly': 'SFAPMF----*****',
  'radar-friendly': 'SFGPUCD---*****',
  'sam-friendly': 'SFGPUCF---*****',
  'cuas-friendly': 'SFGPUCI---*****',
  'effector-friendly': 'SFGPUCF---*****',
};

export function app6Sidc(category: App6Category, force: App6Force): string {
  const key = `${category}-${force === 'hostile' ? 'hostile' : 'friendly'}`;
  return SIDCS[key] ?? SIDCS['uas-hostile'];
}

export function app6Label(name: string, sidc: string): string {
  return `${sidc.slice(0, 10)} ${name}`;
}
