/**
 * Engagement Economics — cost exchange ratio and salvo leak-through
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

export type CostConfidence = 'Confirmed' | 'Assessed' | 'Estimated' | 'Reported' | 'Suspected';

export interface EconomicsRow {
  platformId: string;
  defeatSystemId: string;
  unitCostUsd: number;
  threatUnitCostUsd: number;
  magazineRounds: number;
  reloadMin: number;
  costConfidence: CostConfidence;
  sourceRef: string;
}

export interface ExchangeRatioResult {
  threatCostUsd: number;
  effectorCostUsd: number;
  pk: number;
  exchangeRatio: number;
  doctrineHint: string;
}

export interface SalvoSimResult {
  leakThroughProbability: number;
  expectedKills: number;
  roundsExpended: number;
}

export function computeExchangeRatio(
  threatCostUsd: number,
  effectorCostUsd: number,
  pk: number,
): ExchangeRatioResult {
  const effectiveCost = effectorCostUsd / Math.max(pk, 0.01);
  const exchangeRatio = effectiveCost / Math.max(threatCostUsd, 1);
  let doctrineHint = 'Layered defence — preserve high-cost interceptors for high-value threats.';
  if (exchangeRatio > 50) doctrineHint = 'Cost catastrophe — shift to RF/HPM or point-defence kinetic before SAM expenditure.';
  else if (exchangeRatio > 10) doctrineHint = 'Unfavourable exchange — cue lowest-cost effector first; reserve SAM for confirmed LACM.';
  return {
    threatCostUsd,
    effectorCostUsd,
    pk,
    exchangeRatio,
    doctrineHint,
  };
}

export function simulateSalvoStochastic(
  magazine: number,
  salvoSize: number,
  pkPerShot: number,
  threatCount: number,
): SalvoSimResult {
  let remaining = magazine;
  let kills = 0;
  let threats = threatCount;
  while (threats > 0 && remaining > 0) {
    const shots = Math.min(salvoSize, remaining, threats);
    for (let i = 0; i < shots; i++) {
      if (Math.random() < pkPerShot) {
        kills += 1;
        threats -= 1;
      }
      remaining -= 1;
      if (threats <= 0) break;
    }
  }
  const leakThroughProbability = threats / Math.max(threatCount, 1);
  return {
    leakThroughProbability,
    expectedKills: kills,
    roundsExpended: magazine - remaining,
  };
}

/** Default salvo model — deterministic expected-value (reproducible for training). */
export function simulateSalvo(
  magazine: number,
  salvoSize: number,
  pkPerShot: number,
  threatCount: number,
): SalvoSimResult {
  return simulateSalvoDeterministic(magazine, salvoSize, pkPerShot, threatCount);
}

export function simulateSalvoDeterministic(
  magazine: number,
  salvoSize: number,
  pkPerShot: number,
  threatCount: number,
): SalvoSimResult {
  let remaining = magazine;
  let expectedKills = 0;
  let threatsLeft = threatCount;
  while (threatsLeft > 0 && remaining > 0) {
    const shots = Math.min(salvoSize, remaining);
    const pkThisSalvo = 1 - Math.pow(1 - pkPerShot, shots);
    const killsThisSalvo = Math.min(threatsLeft, pkThisSalvo);
    expectedKills += killsThisSalvo;
    threatsLeft = Math.max(0, threatCount - Math.floor(expectedKills + 0.5));
    remaining -= shots;
    if (pkThisSalvo >= 0.99) threatsLeft = Math.max(0, threatCount - Math.ceil(expectedKills));
  }
  return {
    leakThroughProbability: threatsLeft / Math.max(threatCount, 1),
    expectedKills: Math.min(threatCount, Math.round(expectedKills)),
    roundsExpended: magazine - remaining,
  };
}

export function recommendLayer(exchangeRatio: number): 'rf' | 'kinetic_point' | 'sam' {
  if (exchangeRatio > 50) return 'rf';
  if (exchangeRatio > 10) return 'kinetic_point';
  return 'sam';
}

export const OSINT_THREAT_COSTS_USD: Record<string, number> = {
  'shahed-136': 20_000,
  'lancet-3m': 6_000,
  'kalibr-3m14': 1_000_000,
  'jassm-er': 2_000_000,
};
