import { NextRequest, NextResponse } from 'next/server';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';
import { createServiceRoleNodeClient } from '@/lib/supabase/service-role-node';
import {
  listCurrencyUpdates,
  upsertCurrencyUpdate,
  validateDsPlayer,
  currencyEngine,
} from '@/lib/moat/moatStore';

export async function GET(req: NextRequest) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const dsPlayerId = searchParams.get('ds_player_id');
    const status = searchParams.get('status') ?? undefined;
    if (!dsPlayerId) {
      return NextResponse.json({ error: 'ds_player_id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleNodeClient();
    const isDs = await validateDsPlayer(supabase, dsPlayerId);
    if (!isDs) {
      return NextResponse.json({ error: 'DS role required' }, { status: 403 });
    }

    const updates = await listCurrencyUpdates(supabase, status);
    const report = currencyEngine.currencyReport(updates);
    return NextResponse.json({ updates, report });
  } catch (err) {
    console.error('[SPECTRAL] GET currency error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const dsPlayerId = body.ds_player_id as string | undefined;
    if (!dsPlayerId) {
      return NextResponse.json({ error: 'ds_player_id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleNodeClient();
    const isDs = await validateDsPlayer(supabase, dsPlayerId);
    if (!isDs) {
      return NextResponse.json({ error: 'DS role required' }, { status: 403 });
    }

    const proposed = currencyEngine.proposeUpdate({
      type: body.type,
      title: body.title,
      summary: body.summary,
      source_type: body.source_type,
      source_reference: body.source_reference,
      detected_at: body.detected_at ?? new Date().toISOString(),
      proposed_effect: body.proposed_effect,
      affects: body.affects ?? { competencies: [], scenarios: [], injects: [] },
    });

    await upsertCurrencyUpdate(supabase, proposed);
    return NextResponse.json({ update: proposed }, { status: 201 });
  } catch (err) {
    console.error('[SPECTRAL] POST currency error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const dsPlayerId = body.ds_player_id as string | undefined;
    const updateId = body.id as string | undefined;
    const decision = body.decision as 'approved' | 'rejected' | undefined;
    if (!dsPlayerId || !updateId || !decision) {
      return NextResponse.json(
        { error: 'ds_player_id, id, and decision are required' },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleNodeClient();
    const isDs = await validateDsPlayer(supabase, dsPlayerId);
    if (!isDs) {
      return NextResponse.json({ error: 'DS role required' }, { status: 403 });
    }

    const updates = await listCurrencyUpdates(supabase);
    const existing = updates.find((u) => u.id === updateId);
    if (!existing) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    const reviewed = currencyEngine.review(
      existing,
      decision,
      dsPlayerId,
      body.review_notes ?? '',
      new Date().toISOString(),
    );
    await upsertCurrencyUpdate(supabase, reviewed);
    return NextResponse.json({ update: reviewed });
  } catch (err) {
    console.error('[SPECTRAL] PATCH currency error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
