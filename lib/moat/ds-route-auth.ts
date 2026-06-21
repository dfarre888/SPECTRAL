// SPECTRAL — DS route authorization helpers
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
//
// Closes the authorization scope gap where client-supplied ds_player_id
// was never bound to the authenticated Supabase session.
//
// Pattern (currency/actions precedent):
//   1. resolveSessionDsPlayerId  — derive DS player UUID from auth.uid()
//   2. assertDsPlayerMatchesSession — 403 if supplied ID doesn't match session
//   3. dsCanAccessLearner — 403 if DS has no exercise with this learner as a player

import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo'

/**
 * Resolve the spectral_players.id for the authenticated user who has role='ds'.
 * Returns null if the user has no DS player record.
 */
export async function resolveSessionDsPlayerId(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('spectral_players')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('role', 'ds')
    .maybeSingle()
  return data?.id ?? null
}

/**
 * Returns a 403 NextResponse if requestedId does not match the session DS player ID,
 * or null if the caller is authorised to proceed.
 */
export function assertDsPlayerMatchesSession(
  requestedId: string,
  sessionDsId: string | null,
): NextResponse | null {
  if (!sessionDsId || requestedId !== sessionDsId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

/**
 * Returns true when dsPlayerId is assigned as DS in at least one exercise
 * that has targetPlayerId as a red or blue player.
 *
 * Prevents a DS from reading learner records for trainees they have
 * never been assigned to supervise.
 */
export async function dsCanAccessLearner(
  supabase: SupabaseClient,
  dsPlayerId: string,
  targetPlayerId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('spectral_exercises')
    .select('id')
    .eq('ds_player_id', dsPlayerId)
    .or(`red_player_id.eq.${targetPlayerId},blue_player_id.eq.${targetPlayerId}`)
    .limit(1)
    .maybeSingle()
  return !!data
}

/**
 * Centralised DS route authorization: bind ds_player_id to session and optionally
 * verify learner exercise scope. Skipped in local demo mode (no real session).
 */
export async function authorizeDsRoute(
  supabase: SupabaseClient,
  authUserId: string,
  requestedDsId: string,
  targetPlayerId?: string,
): Promise<NextResponse | null> {
  if (!isDemoMode()) {
    const sessionDsId = await resolveSessionDsPlayerId(supabase, authUserId)
    const bindErr = assertDsPlayerMatchesSession(requestedDsId, sessionDsId)
    if (bindErr) return bindErr

    if (targetPlayerId) {
      const canAccess = await dsCanAccessLearner(supabase, requestedDsId, targetPlayerId)
      if (!canAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }
  return null
}
