/** Local training / sales demo — bypasses auth gate and uses service-role reads server-side. */
export const DEFAULT_DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001'
export const DEFAULT_DEMO_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000099'

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production'
}

export function getDemoAdminUserId(): string {
  return process.env.SPECTRAL_DEMO_ADMIN_USER_ID ?? DEFAULT_DEMO_ADMIN_USER_ID
}

export function getDemoTenantId(): string {
  return process.env.SPECTRAL_TENANT_ID ?? DEFAULT_DEMO_TENANT_ID
}

export function isDemoOperationsContext(): boolean {
  return isDemoMode() && process.env.SPECTRAL_EDITION === 'operations'
}
