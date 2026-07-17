import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { isDemoMode } from '@/lib/demo'

export async function createClient() {
  // Local demo: service-role reads/writes so all modules work without a Supabase session.
  // Callers: app/(main)/**/page.tsx, app/api/**/route.ts, lib/operations/tenant.ts, lib/pcm/require-auth.ts.
  // User request: "do the demo with full login and capabilities".
  if (isDemoMode()) {
    return createServiceClient()
  }

  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs: { name: string; value: string; options: Partial<ResponseCookie> }[]) => {
          cs.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

export async function createServiceClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
}
