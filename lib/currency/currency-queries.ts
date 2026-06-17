import { createClient, createServiceClient } from '@/lib/supabase/server';
import { listCurrencyUpdates } from '@/lib/moat/moatStore';
import type { CurrencyUpdate } from '@/lib/currency/currency-types';

export async function fetchCurrencyUpdates(status?: string): Promise<CurrencyUpdate[]> {
  const supabase = await createClient();
  return listCurrencyUpdates(supabase, status);
}

export async function fetchProposedCurrencyCount(): Promise<number> {
  const supabase = await createClient();
  const rows = await listCurrencyUpdates(supabase, 'proposed');
  return rows.length;
}

export async function reviewCurrencyUpdateRow(
  id: string,
  status: CurrencyUpdate['status'],
  reviewedBy: string,
  reviewNotes?: string,
): Promise<void> {
  const supabase = await createServiceClient();
  const { data: existing, error: readErr } = await supabase
    .from('spectral_currency_updates')
    .select('*')
    .eq('id', id)
    .single();
  if (readErr || !existing) throw new Error(readErr?.message ?? 'Currency update not found');

  const { error } = await supabase.from('spectral_currency_updates').upsert({
    ...existing,
    status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
    review_notes: reviewNotes ?? existing.review_notes,
  });
  if (error) throw new Error(error.message);
}
