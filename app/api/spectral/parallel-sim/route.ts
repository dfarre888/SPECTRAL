import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertResidency } from '@/lib/moat/sovereignData';
import type { ForceDesignQuestion } from '@/lib/moat/forceDesignEngine';
import { parallelSimOrchestrator } from '@/lib/pcm/parallel-sim-orchestrator';

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  assertResidency('ap-southeast-2');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const question = (await req.json()) as ForceDesignQuestion;
  const result = await parallelSimOrchestrator.run({ question, mode: 'sequential' }, new Date().toISOString());
  return NextResponse.json(result);
}
