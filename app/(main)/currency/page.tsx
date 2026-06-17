import { createClient } from '@/lib/supabase/server';
import { fetchCurrencyUpdates } from '@/lib/currency/currency-queries';
import { validateDsPlayer } from '@/lib/moat/moatStore';
import { CurrencyQueueClient } from '@/components/currency/CurrencyQueueClient';

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] font-mono store-text-muted uppercase tracking-wider">Moat Builder</p>
        <h1 className="text-2xl font-semibold text-white mt-1">Currency Updates</h1>
        <p className="text-sm store-text-body mt-2 max-w-2xl">
          Tactical currency proposals require DS review before they inform training emphasis. Players see approved updates only.
        </p>
      </div>
      <CurrencyQueueClient updates={updates} isDs={isDs} />
    </div>
  );
}
