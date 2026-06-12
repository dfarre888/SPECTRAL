/**
 * OIDC/SAML configuration for Spectral Operations on-prem / sovereign cloud.
 * Wire to Keycloak, Azure AD, or customer IdP via environment variables.
 */

export interface OidcConfig {
  enabled: boolean
  issuer: string
  clientId: string
  audience?: string
}

export function getOidcConfig(): OidcConfig {
  return {
    enabled: process.env.SPECTRAL_OIDC_ENABLED === 'true',
    issuer: process.env.SPECTRAL_OIDC_ISSUER ?? '',
    clientId: process.env.SPECTRAL_OIDC_CLIENT_ID ?? '',
    audience: process.env.SPECTRAL_OIDC_AUDIENCE,
  }
}

export const RBAC_ROLES = ['operator', 'analyst', 'commander', 'admin'] as const

export function roleCanRunPropagation(role: string): boolean {
  return role === 'operator' || role === 'analyst' || role === 'commander' || role === 'admin'
}

export function roleCanImportPlatforms(role: string): boolean {
  return role === 'analyst' || role === 'admin'
}
