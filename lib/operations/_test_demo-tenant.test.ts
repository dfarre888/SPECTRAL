import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  DEFAULT_DEMO_ADMIN_USER_ID,
  DEFAULT_DEMO_TENANT_ID,
  getDemoAdminUserId,
  getDemoTenantId,
  isDemoMode,
  isDemoOperationsContext,
} from '@/lib/demo'

describe('demo operations tenant helpers', () => {
  const env = process.env

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true')
    vi.stubEnv('SPECTRAL_EDITION', 'operations')
  })

  afterEach(() => {
    process.env = env
    vi.unstubAllEnvs()
  })

  it('detects demo+operations context', () => {
    expect(isDemoOperationsContext()).toBe(true)
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false')
    expect(isDemoOperationsContext()).toBe(false)
  })

  it('returns default demo admin and tenant ids', () => {
    expect(getDemoAdminUserId()).toBe(DEFAULT_DEMO_ADMIN_USER_ID)
    expect(getDemoTenantId()).toBe(DEFAULT_DEMO_TENANT_ID)
  })

  it('reads env overrides for demo admin and tenant', () => {
    vi.stubEnv('SPECTRAL_DEMO_ADMIN_USER_ID', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    vi.stubEnv('SPECTRAL_TENANT_ID', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
    expect(getDemoAdminUserId()).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    expect(getDemoTenantId()).toBe('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  })

  it('isDemoMode is false in production even when demo flag is set', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true')
    vi.stubEnv('NODE_ENV', 'production')
    expect(isDemoMode()).toBe(false)
    vi.stubEnv('NODE_ENV', 'development')
    expect(isDemoMode()).toBe(true)
  })
})
