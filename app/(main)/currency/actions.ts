'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { validateDsPlayer } from '@/lib/moat/moatStore';
import { reviewCurrencyUpdateRow } from '@/lib/currency/currency-queries';
import type { UpdateStatus } from '@/lib/currency/currency-types';

export async function reviewCurrencyUpdate(
  id: string,
  status: UpdateStatus,
  notes?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorised' };

  const { data: player } = await supabase
    .from('spectral_players')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!player?.id) return { ok: false, error: 'Player profile required' };

  const isDs = player.role === 'ds' || (await validateDsPlayer(supabase, player.id));
  if (!isDs) return { ok: false, error: 'DS role required' };

  try {
    await reviewCurrencyUpdateRow(id, status, player.id, notes);
    revalidatePath('/currency');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
