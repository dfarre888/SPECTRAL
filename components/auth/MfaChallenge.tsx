'use client'

import { useState } from 'react'
import { Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { OtpInput } from '@/components/auth/OtpInput'

interface MfaChallengeProps {
  onSuccess: () => void
  onCancel?: () => void
}

export function MfaChallenge({ onSuccess, onCancel }: MfaChallengeProps) {
  const [error, setError] = useState('')
  const [otpError, setOtpError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleComplete(code: string) {
    setError('')
    setOtpError(false)
    setSubmitting(true)
    const supabase = createClient()
    try {
      const { data: factorsData, error: lfErr } = await supabase.auth.mfa.listFactors()
      if (lfErr) throw lfErr
      const totpFactor = factorsData.totp[0]
      if (!totpFactor) {
        setError('No authenticator configured.')
        return
      }
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code,
      })
      if (verifyErr) throw verifyErr
      onSuccess()
    } catch (err: unknown) {
      setOtpError(true)
      setError((err as Error).message || 'Invalid code. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-[var(--store-accent-glow)] border border-[var(--store-accent-border)]">
          <Shield className="w-6 h-6 text-[var(--store-accent)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Two-factor authentication</h2>
          <p className="text-sm store-text-muted">Enter the 6-digit code from your authenticator app</p>
        </div>
      </div>
      <OtpInput onComplete={handleComplete} loading={submitting} error={otpError} />
      {error && <p className="text-xs text-red text-center">{error}</p>}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2.5 rounded-xl border border-[var(--store-line)] text-sm store-text-muted hover:text-white"
        >
          Sign out
        </button>
      )}
    </div>
  )
}
