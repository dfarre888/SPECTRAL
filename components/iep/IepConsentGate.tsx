'use client'

import { useCallback, useEffect, useState } from 'react'
import { StorePanel } from '@/components/ui/store-surface'
import type { ConsentStatus } from '@/lib/iep/types'

interface IepConsentGateProps {
  participantId: string
  onConsentReady: (ready: boolean) => void
  parentCarerName: string
  onParentCarerNameChange: (v: string) => void
  consentChecked: boolean
  onConsentCheckedChange: (v: boolean) => void
  under15AssentConfirmed: boolean
  onUnder15AssentChange: (v: boolean) => void
}

export function IepConsentGate({
  participantId,
  onConsentReady,
  parentCarerName,
  onParentCarerNameChange,
  consentChecked,
  onConsentCheckedChange,
  under15AssentConfirmed,
  onUnder15AssentChange,
}: IepConsentGateProps) {
  const [status, setStatus] = useState<ConsentStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/app/iep/consent/${participantId}`)
      const json = await res.json()
      setStatus(json.data as ConsentStatus)
      onConsentReady(json.data?.valid === true)
    } catch {
      setStatus(null)
      onConsentReady(false)
    } finally {
      setLoading(false)
    }
  }, [participantId, onConsentReady])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <StorePanel className="p-4 animate-pulse">
        <div className="h-4 w-1/2 bg-[var(--store-surface-2)] rounded" />
      </StorePanel>
    )
  }

  if (status?.valid && !status.expiringSoon) {
    return (
      <StorePanel className="p-4 border-[var(--store-success)]/30">
        <p className="text-xs font-mono text-[var(--store-success)]">AI consent active</p>
        <p className="text-sm store-text-body mt-1">
          Granted{' '}
          {status.record?.granted_at
            ? new Date(status.record.granted_at).toLocaleDateString('en-AU')
            : '—'}
          · Expires{' '}
          {status.record?.expires_at
            ? new Date(status.record.expires_at).toLocaleDateString('en-AU')
            : '—'}
        </p>
      </StorePanel>
    )
  }

  const needsReconsent = status?.expired || status?.expiringSoon

  return (
    <StorePanel className="p-4 border-[var(--store-accent-border)]">
      {needsReconsent && (
        <p className="text-xs font-semibold text-[var(--store-accent)] mb-2">
          {status?.expired ? 'Re-consent required' : 'Consent expiring soon — re-consent recommended'}
        </p>
      )}
      <p className="text-sm store-text-body mb-3">
        Parent/carer consent is required to process sensitive child health and education data using
        AI. Consent expires after 12 months. AI-generated drafts require professional review before
        school use.
      </p>
      <label className="block text-xs store-text-muted mb-1">Parent/carer name</label>
      <input
        className="w-full mb-3 px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
        value={parentCarerName}
        onChange={(e) => onParentCarerNameChange(e.target.value)}
        placeholder="Full name of consenting parent/carer"
      />
      <label className="flex items-start gap-2 text-sm store-text-body mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => {
            onConsentCheckedChange(e.target.checked)
            onConsentReady(e.target.checked && parentCarerName.trim().length > 0)
          }}
          className="mt-1"
        />
        <span>
          I confirm parent/carer consent for AI-assisted IEP drafting, including processing of
          sensitive information under the Privacy Act 1988.
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm store-text-body cursor-pointer">
        <input
          type="checkbox"
          checked={under15AssentConfirmed}
          onChange={(e) => onUnder15AssentChange(e.target.checked)}
          className="mt-1"
        />
        <span>
          Where the participant is under 15, I confirm parent consent and age-appropriate student
          notification has occurred.
        </span>
      </label>
    </StorePanel>
  )
}
