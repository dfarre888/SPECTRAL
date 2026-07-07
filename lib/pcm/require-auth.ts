import 'server-only'
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode, getDemoAdminUserId } from '@/lib/demo';

export async function requireSpectralAuth(allowedRoles?: string[]) {
  // Local demo: skip real auth, return a synthetic demo user so API routes work
  // without a real Supabase session. isDemoMode() is false in production.
  if (isDemoMode()) {
    return {
      user: { id: getDemoAdminUserId() } as { id: string },
      response: null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }),
    };
  }

  if (allowedRoles?.length) {
    const { data: player } = await supabase
      .from('spectral_players')
      .select('role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!player?.role || !allowedRoles.includes(player.role)) {
      return {
        user: null,
        response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      };
    }
  }

  return { user, response: null };
}
