/**
 * Inbound threat kinematics — grid-hop progression toward Blue C2.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import { estimateGridRangeKm, gridRef } from '@/lib/pcm/pcm-spectrum-bridge';
import { fogOfWarEngine } from '@/lib/pcm/fogOfWarEngine';

type Platform = PCM.Platform;

const GRID_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function parseGrid(grid: string): { letter: string; num: number } {
  const letter = (grid.charAt(0) || 'E').toUpperCase();
  const numMatch = grid.match(/\d+/);
  return { letter, num: numMatch ? parseInt(numMatch[0], 10) : 5 };
}

function formatGrid(letter: string, num: number): string {
  return `${letter}-${num}`;
}

/** Step threat one grid hop toward target grid per turn. */
export function advanceThreatPosition(
  threat: Platform,
  targetGrid: string,
  _turnMinutes: number,
): void {
  if (threat.status === 'destroyed' || threat.status === 'mission_complete') return;

  const current = parseGrid(gridRef(threat));
  const target = parseGrid(targetGrid);

  const curLi = GRID_LETTERS.indexOf(current.letter);
  const tgtLi = GRID_LETTERS.indexOf(target.letter);
  if (curLi < 0 || tgtLi < 0) return;

  let nextLetter = current.letter;
  let nextNum = current.num;

  if (curLi !== tgtLi) {
    nextLetter = GRID_LETTERS[curLi + (tgtLi > curLi ? 1 : -1)];
  } else if (current.num !== target.num) {
    nextNum = current.num + (target.num > current.num ? 1 : -1);
  }

  const nextGrid = formatGrid(nextLetter, nextNum);
  threat.location_grid = nextGrid;
}

export function computeInboundRangeKm(threat: Platform, blueC2Grid: string): number {
  return estimateGridRangeKm(gridRef(threat), blueC2Grid);
}

export function computeThreatTti(threat: Platform, blueC2Grid: string): number | null {
  const rangeKm = computeInboundRangeKm(threat, blueC2Grid);
  return fogOfWarEngine.computeTimeToImpact(threat, rangeKm);
}

export function defaultAltitudeForGroup(group: string): number {
  switch (group) {
    case 'OWA':
      return 200;
    case 'FPV':
      return 50;
    case 'loitering_munition':
      return 1500;
    case 'decoy':
      return 200;
    default:
      return 500;
  }
}

export function advanceAllInboundThreats(
  threats: Platform[],
  blueC2Grid: string,
  turnMinutes: number,
): void {
  for (const t of threats) {
    if (['airborne_tasked', 'airborne_loiter'].includes(t.status)) {
      advanceThreatPosition(t, blueC2Grid, turnMinutes);
    }
  }
}
