import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode, getDemoAdminUserId } from '@/lib/demo';

export async function requireSpectralAuth() {
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

  return { user, response: null };
}
