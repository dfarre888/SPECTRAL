import { createClient } from '@/lib/supabase/server';
import { fetchCurrencyUpdates } from '@/lib/currency/currency-queries';
import { validateDsPlayer } from '@/lib/moat/moatStore';
import { CurrencyQueueClient } from '@/components/currency/CurrencyQueueClient';
import { HubPageShell } from '@/components/hub/HubPageShell';

export default async function CurrencyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: player } = user
    ? await supabase.from('spectral_players').select('id, role').eq('auth_user_id', user.id).maybeSingle()
    : { data: null };

  const isDs = Boolean(
    player?.role === 'ds' || (player?.id && (await validateDsPlayer(supabase, player.id))),
  );

  const updates = await fetchCurrencyUpdates(isDs ? undefined : 'approved');

  return (
    <HubPageShell
      eyebrow="Administration"
      title="Currency Queue"
      subtitle="Tactical currency proposals need directing staff review before publication. Operators see approved updates only."
      headerAction={
        <p className="text-[11px] font-mono store-text-muted">
          Date of information: Jul 2026 · {updates.length} {updates.length === 1 ? 'record' : 'records'}
        </p>
      }
    >
      <CurrencyQueueClient updates={updates} isDs={isDs} />
    </HubPageShell>
  );
}
