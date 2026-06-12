'use client';
/**
 * Effector data access — loads F3 shooters and exposes them to the kill-chain
 * engine, AeroCopilot, and the map. Supabase path documented (mirror radars).
 */

import { useMemo } from 'react';
import type { EffectorSystem, EffectorTier } from '@/lib/spectrum/effector-types';
import { BLUE_EFFECTORS } from '@/data/seed-effectors-blue';
import { RED_EFFECTORS } from '@/data/seed-effectors-red';

const ALL_EFFECTORS: EffectorSystem[] = [...BLUE_EFFECTORS, ...RED_EFFECTORS];

export function useEffectors() {
  // Supabase path: query an `effector_systems` table, map rows → EffectorSystem.
  return useMemo(() => ALL_EFFECTORS, []);
}

export function useEffector(id: string | null): EffectorSystem | null {
  return useMemo(() => (id ? ALL_EFFECTORS.find((e) => e.id === id) ?? null : null), [id]);
}

/** Order effectors by tier for the layered-defence view. */
const TIER_ORDER: EffectorTier[] = ['strategic_bmd', 'long', 'medium', 'shorad', 'point_defence', 'ciws_naval', 'c_uas'];

export function effectorsByTier(effectors: EffectorSystem[], side?: 'red' | 'blue') {
  const filtered = side ? effectors.filter((e) => e.side === side) : effectors;
  return TIER_ORDER.map((tier) => ({
    tier,
    effectors: filtered.filter((e) => e.tier === tier),
  })).filter((g) => g.effectors.length > 0);
}
