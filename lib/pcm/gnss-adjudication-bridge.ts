import type { GnssJammingEffect, GnssPlatformDependency } from '@/lib/gnss/gnss-types';

export type GnssVulnerability = GnssJammingEffect | 'immune';

/**
 * Primary GNSS dependency jamming effect for a platform catalogue id.
 * Returns `immune` when dependency_level is immune; `none` when no primary row.
 */
export function gnssVulnerabilityForPlatform(
  platformId: string,
  deps: GnssPlatformDependency[],
): GnssVulnerability {
  const immune = deps.find(
    (d) => d.platform_id === platformId && d.dependency_level === 'immune',
  );
  if (immune) return 'immune';

  const primary = deps.find(
    (d) => d.platform_id === platformId && d.dependency_level === 'primary',
  );
  if (!primary) return 'none';
  return primary.jamming_effect;
}


/**
 * Count red threats that lose primary GNSS navigation under active jamming.
 * Pure helper for PCM adjudication — no Supabase I/O.
 */
export function countGnssDependentThreats(
  threatIds: string[],
  dependencies: GnssPlatformDependency[],
  activeJamming: boolean,
): number {
  if (!activeJamming || threatIds.length === 0) return 0;

  const threatSet = new Set(threatIds);
  const vulnerable = new Set<string>();

  for (const dep of dependencies) {
    if (!threatSet.has(dep.platform_id)) continue;
    if (dep.dependency_level === 'primary' && dep.jamming_effect === 'mission_kill') {
      vulnerable.add(dep.platform_id);
    }
  }

  return vulnerable.size;
}
