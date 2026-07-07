import { NextRequest, NextResponse } from 'next/server';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';
import { createServiceRoleNodeClient } from '@/lib/supabase/service-role-node';
import { saveForceDesignReport, validateDsPlayer } from '@/lib/moat/moatStore';
import { authorizeDsRoute } from '@/lib/moat/ds-route-auth';
import {
  forceDesignEngine,
  type ForceDesignQuestion,
  type RunOutcome,
} from '@/lib/moat/forceDesignEngine';

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const dsPlayerId = body.ds_player_id as string | undefined;
    const question = body.question as ForceDesignQuestion | undefined;
    const outcomes = (body.outcomes ?? []) as RunOutcome[];

    if (!dsPlayerId || !question) {
      return NextResponse.json(
        { error: 'ds_player_id and question are required' },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleNodeClient();
    const isDs = await validateDsPlayer(supabase, dsPlayerId);
    if (!isDs) {
      return NextResponse.json({ error: 'DS role required' }, { status: 403 });
    }

    const authErr = await authorizeDsRoute(supabase, auth.user!.id, dsPlayerId);
    if (authErr) return authErr;

    const now = new Date().toISOString();
    const report = forceDesignEngine.analyse(question, outcomes, now);
    const reportId = await saveForceDesignReport(supabase, report, dsPlayerId);

    return NextResponse.json({ report_id: reportId, report });
  } catch (err) {
    console.error('[SPECTRAL] POST force-design error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
