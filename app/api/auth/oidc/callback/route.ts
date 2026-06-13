import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOidcConfig } from '@/lib/operations/auth-config'
import { writeAuditLog } from '@/lib/operations/audit'

/**
 * OIDC authorization-code callback.
 * Exchanges code with IdP token endpoint when SPECTRAL_OIDC_CLIENT_SECRET is set,
 * then establishes Supabase session via signInWithIdToken when provider supports it.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url))
  }
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  const cfg = getOidcConfig()
  if (!cfg.enabled || !cfg.issuer || !cfg.clientId) {
    return NextResponse.redirect(new URL('/login?error=oidc_disabled', request.url))
  }

  const redirectUri = new URL('/api/auth/oidc/callback', request.url).toString()
  const tokenUrl = `${cfg.issuer.replace(/\/$/, '')}/protocol/openid-connect/token`

  if (!process.env.SPECTRAL_OIDC_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL('/login?error=oidc_secret_not_configured', request.url),
    )
  }

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: cfg.clientId,
      client_secret: process.env.SPECTRAL_OIDC_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url))
  }

  const tokens = (await tokenRes.json()) as { id_token?: string; access_token?: string }
  const supabase = await createClient()

  if (tokens.id_token) {
    const { error: signInError } = await supabase.auth.signInWithIdToken({
      provider: 'keycloak',
      token: tokens.id_token,
    })
    if (signInError) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(signInError.message)}`, request.url),
      )
    }
  }

  await writeAuditLog({
    tenantId: process.env.SPECTRAL_DEFAULT_TENANT ?? 'default',
    userId: 'oidc-user',
    action: 'auth.oidc.login',
    resourceType: 'session',
    classification: 'UNCLASSIFIED',
    metadata: { provider: cfg.issuer },
  })

  return NextResponse.redirect(new URL('/', request.url))
}
