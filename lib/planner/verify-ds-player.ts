import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { isOperationsEdition } from '@/lib/operations/edition';

/**
 * Verify dsPlayerId may be used for PCM publish.
 * Training tier: only self. Operations: self or same-tenant member.
 */
export async function verifyDsPlayerId(
  dsPlayerId: string,
  callerUserId: string,
  tenantId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (dsPlayerId === callerUserId) return { ok: true };

  if (!isOperationsEdition()) {
    return { ok: false, reason: 'dsPlayerId must match authenticated user in training tier' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tenant_members')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('user_id', dsPlayerId)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message };
  if (!data) return { ok: false, reason: 'dsPlayerId is not a member of this tenant' };
  return { ok: true };
}
