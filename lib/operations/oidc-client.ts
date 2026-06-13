'use client'

export function isOidcEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_SPECTRAL_OIDC_ENABLED === 'true'
}

export function getOidcLoginHref(): string | null {
  if (!isOidcEnabledClient()) return null
  const issuer = process.env.NEXT_PUBLIC_SPECTRAL_OIDC_ISSUER
  const clientId = process.env.NEXT_PUBLIC_SPECTRAL_OIDC_CLIENT_ID
  if (!issuer || !clientId) return null

  const redirectUri =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/auth/oidc/callback`
      : ''

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
  })

  return `${issuer.replace(/\/$/, '')}/protocol/openid-connect/auth?${params.toString()}`
}
