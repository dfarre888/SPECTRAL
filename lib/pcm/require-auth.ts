import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function requireSpectralAuth() {
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
