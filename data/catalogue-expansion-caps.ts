/**
 * Spectrum capabilities for catalogue expansion platforms.
 * CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type { SpectrumCapability } from '@/lib/spectrum/types';
import {
  capsDecoyOwa,
  capsFpv,
  capsHel,
  capsHeroFamily,
  capsLoiteringMunition,
  capsMaleUcav,
  capsNavalCiws,
  capsNavalUsv,
  capsOwaAttack,
  capsRfJammer,
  capsTacticalIsr,
  capsVtolIsr,
} from '@/data/capability-templates';
import { CATALOGUE_EXPANSION_PLATFORMS } from '@/data/catalogue-expansion';

const TACTICAL_ISR = new Set([
  'zala-eleron-3sv', 'supercam-s350', 'supercam-s250', 'mohajer-mersad',
  'aeronautics-orbiter', 'ncsist-cardinal', 'rq-7b-shadow',
]);

const MALE = new Set([
  'shahed-129', 'shahed-149-gaza', 'mohajer-6', 'wing-loong-1', 'ch-5-rainbow',
  'tb-001', 'mq-1c-gray-eagle', 'bayraktar-kizilelma', 'tai-anka', 'avic-nine-sky',
  'ga-xq-67a-obss', 'ga-mq-20-avenger', 'mq-1-predator', 'uj-22-airborne', 'uj-26-bober',
]);

const OWA = new Set(['samad-2', 'shahed-238', 'houthi-owa-maritime', 'qasef-1']);

const FPV = new Set(['molniya-2-fpv', 'kazhan', 'fpv-interceptor']);

const VTOL = new Set(['schiebel-camcopter-s100']);

const NAVAL = new Set(['magura-v5', 'black-sea-usv-swarm']);

const GNSS_FREE = new Set(['v2u']);

const DECOY = new Set(['gerbera-parody']);

const RF_JAMMER_BLUE = new Set([
  'pulsar-l', 'pulsar-v', 'dronesentry-sentrycs', 'jco-swarm-kit',
]);

const HEL_BLUE = new Set(['lite-beam']);

const CIWS_BLUE = new Set([
  'goalkeeper-ciws', 'searam', 'millennium-35mm', 'dardo-fast-forty',
  'starstreak-hvm', 'hq-17', 'eos-slinger', 'smash-hopper', 'phalanx-ciws',
]);

const HERO = new Map([
  ['uvision-hero-30', { range: 10, warhead: 0.5 }],
  ['uvision-hero-70', { range: 40, warhead: 1.2 }],
  ['uvision-hero-900', { range: 150, warhead: 8 }],
]);

function capsForPlatform(id: string, rangeKm: number): SpectrumCapability[] {
  if (DECOY.has(id)) return capsDecoyOwa(id);
  if (GNSS_FREE.has(id)) return capsLoiteringMunition(id, rangeKm, { gnssIndependent: true });
  if (FPV.has(id)) return capsFpv(id, rangeKm, id === 'molniya-2-fpv');
  if (TACTICAL_ISR.has(id)) return capsTacticalIsr(id, rangeKm);
  if (MALE.has(id)) return capsMaleUcav(id, rangeKm);
  if (OWA.has(id)) return capsOwaAttack(id, rangeKm);
  if (VTOL.has(id)) return capsVtolIsr(id, rangeKm);
  if (NAVAL.has(id)) return capsNavalUsv(id, rangeKm);
  if (HERO.has(id)) {
    const h = HERO.get(id)!;
    return capsHeroFamily(id, h.range, h.warhead);
  }
  if (HEL_BLUE.has(id)) return capsHel(id, rangeKm);
  if (RF_JAMMER_BLUE.has(id)) return capsRfJammer(id, rangeKm);
  if (CIWS_BLUE.has(id)) return capsNavalCiws(id, rangeKm);
  if (id === 'rotem-l' || id === 'alpagu' || id === 'st-35-silent-thunder' ||
      id === 'cdet-ram' || id === 'uj-32-lastivka' || id === 'privet-82' ||
      id === 'arash-kian' || id === 'elbit-skystriker' || id === 'iai-point-blank' ||
      id === 'iai-green-dragon' || id === 'rafael-spike-firefly' || id === 'casc-ch-901' ||
      id === 'northrop-jackal' || id === 'ncsist-chien-hsiang' || id === 'lentatek-kargi') {
    return capsLoiteringMunition(id, rangeKm);
  }
  if (id === 'baba-yaga' || id === 'vampire') {
    return capsFpv(id, rangeKm);
  }
  if (id === 'fpv-interceptor') return capsFpv(id, rangeKm);
  if (id === 'mq-25-stingray') return capsMaleUcav(id, rangeKm);
  if (id === 'rq-4-global-hawk') return capsMaleUcav(id, rangeKm);
  return capsLoiteringMunition(id, rangeKm);
}

export const CATALOGUE_EXPANSION_CAPABILITIES: SpectrumCapability[] =
  CATALOGUE_EXPANSION_PLATFORMS.flatMap((p) => capsForPlatform(p.id, p.range_km ?? 10));
