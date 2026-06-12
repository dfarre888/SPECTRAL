import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const isOperationsEdition = () => process.env.SPECTRAL_EDITION === 'operations'

export async function middleware(request: NextRequest) {
  if (isDemoMode()) {
    if (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs: { name: string; value: string; options: Partial<ResponseCookie> }[]) => {
          cs.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect all routes except auth pages
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup')

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (isOperationsEdition() && user) {
    const requestHeaders = new Headers(request.headers)
    if (!requestHeaders.get('x-spectral-tenant-id')) {
      const tenantId = process.env.SPECTRAL_TENANT_ID ?? '00000000-0000-0000-0000-000000000001'
      requestHeaders.set('x-spectral-tenant-id', tenantId)
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    supabaseResponse.cookies.getAll().forEach((c) => {
      res.cookies.set(c.name, c.value)
    })
    return res
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
