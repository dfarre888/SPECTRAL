import { NextRequest, NextResponse } from 'next/server';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';
import { createServiceRoleNodeClient } from '@/lib/supabase/service-role-node';
import { listSovereignPlatforms } from '@/lib/moat/moatStore';
import { SOVEREIGN_PLATFORM_CATALOGUE } from '@/lib/moat/sovereignData';

export async function GET(req: NextRequest) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const supabase = createServiceRoleNodeClient();
    let platforms = await listSovereignPlatforms(supabase);
    if (!platforms.length) {
      platforms = SOVEREIGN_PLATFORM_CATALOGUE as unknown as Record<string, unknown>[];
    }
    return NextResponse.json({
      count: platforms.length,
      platforms,
      performance_note: 'All entries use SOVEREIGN_CORE_BOUNDARY — no controlled performance data in open build.',
    });
  } catch (err) {
    console.error('[SPECTRAL] GET sovereign platforms error:', err);
    return NextResponse.json({
      count: SOVEREIGN_PLATFORM_CATALOGUE.length,
      platforms: SOVEREIGN_PLATFORM_CATALOGUE,
      performance_note: 'Fallback in-code catalogue (DB unavailable).',
    });
  }
}
