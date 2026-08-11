import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { ConsentRecord, ConsentStatus } from '@/lib/iep/types'

export type { ConsentStatus, ConsentRecord }

export const IEP_CONSENT_TYPE = 'iep_ai_generation'
export const CONSENT_VALIDITY_MONTHS = 12
export const RECONSENT_WARNING_DAYS = 30

export function consentExpiresAt(from: Date = new Date()): Date {
  const d = new Date(from)
  d.setMonth(d.getMonth() + CONSENT_VALIDITY_MONTHS)
  return d
}

export async function getActiveConsent(
  participantId: string,
  consentType = IEP_CONSENT_TYPE,
): Promise<ConsentRecord | null> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('participant_consents')
    .select('id, participant_id, consent_type, granted_at, expires_at, parent_carer_name, revoked_at')
    .eq('participant_id', participantId)
    .eq('consent_type', consentType)
    .is('revoked_at', null)
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`getActiveConsent: ${error.message}`)
  return data as ConsentRecord | null
}

export function evaluateConsentStatus(record: ConsentRecord | null): ConsentStatus {
  if (!record) {
    return { valid: false, expired: true, expiringSoon: false, record: null, daysUntilExpiry: null }
  }
  const now = Date.now()
  const expires = new Date(record.expires_at).getTime()
  const daysUntilExpiry = Math.ceil((expires - now) / (1000 * 60 * 60 * 24))
  const valid = expires > now && !record.revoked_at
  const expired = !valid
  const expiringSoon = valid && daysUntilExpiry <= RECONSENT_WARNING_DAYS
  return { valid, expired, expiringSoon, record, daysUntilExpiry }
}

export async function grantConsent(input: {
  participantId: string
  tenantId: string
  userId: string
  parentCarerName: string
  parentCarerRelationship?: string
  under15AssentConfirmed?: boolean
}): Promise<ConsentRecord> {
  const supabase = await createClient()
  const expiresAt = consentExpiresAt()
  const { data, error } = await supabase
    .from('participant_consents')
    .insert({
      participant_id: input.participantId,
      tenant_id: input.tenantId,
      consent_type: IEP_CONSENT_TYPE,
      granted_by_user_id: input.userId,
      parent_carer_name: input.parentCarerName,
      parent_carer_relationship: input.parentCarerRelationship ?? null,
      expires_at: expiresAt.toISOString(),
      metadata: {
        under15_assent_confirmed: input.under15AssentConfirmed ?? false,
      },
    })
    .select('id, participant_id, consent_type, granted_at, expires_at, parent_carer_name, revoked_at')
    .single()

  if (error) throw new Error(`grantConsent: ${error.message}`)
  return data as ConsentRecord
}

export async function requireValidConsent(participantId: string): Promise<ConsentRecord> {
  const record = await getActiveConsent(participantId)
  const status = evaluateConsentStatus(record)
  if (!status.valid) {
    throw new Error('Valid IEP AI consent required. Parent/carer re-consent is required.')
  }
  return record!
}
