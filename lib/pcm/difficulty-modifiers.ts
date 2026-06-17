/**
 * Phase 3 difficulty modifiers — ORBAT adjustments at exercise creation.
 */

import type { PCM } from '@/lib/pcm/spectral.types';

type ForceOrbat = PCM.ForceOrbat;
type ForceId = PCM.ForceId;
type Platform = PCM.Platform;

const THREAT_GROUPS = new Set<PCM.PlatformGroup>([
  'OWA',
  'FPV',
  'loitering_munition',
  'decoy',
]);

function cloneOrbat(baseOrbat: unknown): ForceOrbat {
  return JSON.parse(JSON.stringify(baseOrbat)) as ForceOrbat;
}

function duplicatePreLaunchPlatforms(
  platforms: Platform[],
  pctIncrease: number,
  idSuffix: string,
): Platform[] {
  const preLaunch = platforms.filter(
    (p) => p.status === 'pre_launch' && THREAT_GROUPS.has(p.group),
  );
  if (preLaunch.length === 0) return platforms;

  const extraCount = Math.ceil(preLaunch.length * (pctIncrease - 1));
  const clones: Platform[] = [];
  for (let i = 0; i < extraCount; i++) {
    const source = preLaunch[i % preLaunch.length];
    clones.push({
      ...JSON.parse(JSON.stringify(source)),
      id: `${source.id}${idSuffix}-${i + 1}`,
    });
  }
  return [...platforms, ...clones];
}

function addEwAssetClone(orbat: ForceOrbat, count: number, idSuffix: string): void {
  if (orbat.ew_assets.length === 0 || count <= 0) return;
  const template = orbat.ew_assets[0];
  for (let i = 0; i < count; i++) {
    orbat.ew_assets.push({
      ...JSON.parse(JSON.stringify(template)),
      id: `${template.id}${idSuffix}-${i + 1}`,
      status: 'inactive',
    });
  }
}

function setExpertEwImmune(platforms: Platform[]): void {
  const candidates = platforms.filter(
    (p) => p.guidance !== 'fibre_optic_FPV' && !p.ew_immune,
  );
  const immuneCount = Math.ceil(candidates.length * 0.2);
  candidates.slice(0, immuneCount).forEach((p) => {
    p.ew_immune = true;
  });
}

function applyBlueDifficulty(
  orbat: ForceOrbat,
  magazineReduction: number,
  linkHealth: number,
  commsDegraded: boolean,
): void {
  const remaining = Math.max(0, Math.round(orbat.magazine_remaining * (1 - magazineReduction)));
  orbat.magazine_remaining = remaining;
  orbat.c2.link_health_percent = linkHealth;
  if (commsDegraded) {
    orbat.comms_status = 'degraded_light';
    orbat.c2.comms_status = 'degraded_light';
  }
  if (orbat.magazine_by_type) {
    orbat.magazine_by_type.kinetic_interceptors = Math.max(
      0,
      Math.round(orbat.magazine_by_type.kinetic_interceptors * (1 - magazineReduction)),
    );
    orbat.magazine_by_type.total_remaining = remaining;
  }
}

/** Apply difficulty scaling to a force ORBAT at exercise creation. */
export function applyDifficultyModifiers(
  baseOrbat: unknown,
  difficulty: string,
  force: ForceId,
): ForceOrbat {
  const orbat = cloneOrbat(baseOrbat);

  if (difficulty === 'base') {
    return orbat;
  }

  if (force === 'RED') {
    if (difficulty === 'advanced') {
      orbat.platforms = duplicatePreLaunchPlatforms(orbat.platforms, 1.3, '-ADV');
      addEwAssetClone(orbat, 1, '-ADV');
    }
    if (difficulty === 'expert') {
      orbat.platforms = duplicatePreLaunchPlatforms(orbat.platforms, 1.6, '-EXP');
      addEwAssetClone(orbat, 2, '-EXP');
      setExpertEwImmune(orbat.platforms);
    }
  }

  if (force === 'BLUE') {
    if (difficulty === 'advanced') {
      applyBlueDifficulty(orbat, 0.2, 75, false);
    }
    if (difficulty === 'expert') {
      applyBlueDifficulty(orbat, 0.4, 55, true);
    }
  }

  // Phase 3 difficulty modifiers — GAP 6 complete
  return orbat;
}

/** Default typed magazine split when scenario does not provide magazine_by_type. */
export function defaultMagazineByType(magazineRemaining: number): PCM.MagazineState {
  return {
    kinetic_interceptors: Math.round(magazineRemaining * 0.7),
    dew_charge_cycles: 12,
    ew_jamming_hours: 8,
    total_remaining: magazineRemaining,
  };
}
