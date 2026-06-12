import { getOidcConfig } from '@/lib/operations/auth-config'

/**
 * OIDC/SAML scaffold for Operations edition.
 * Full IdP handshake is customer-specific — configure via SPECTRAL_OIDC_* env vars.
 */
export function getOidcLoginUrl(redirectUri: string): string | null {
  const cfg = getOidcConfig()
  if (!cfg.enabled || !cfg.issuer || !cfg.clientId) return null

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
  })

  const base = cfg.issuer.replace(/\/$/, '')
  return `${base}/protocol/openid-connect/auth?${params.toString()}`
}

export function isOidcEnabled(): boolean {
  return getOidcConfig().enabled
}
