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
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(41,151,255,0.45)] bg-[rgba(41,151,255,0.12)]">
          <Shield className="h-5 w-5 text-[var(--wb-blue)]" aria-hidden />
        </div>
        <div>
          <h2 className="store-display text-[18px] font-semibold text-[var(--store-ink)]">Two-factor authentication</h2>
          <p className="mt-0.5 text-[13px] store-text-body">Enter the 6-digit code from your authenticator app.</p>
        </div>
      </div>
      <OtpInput onComplete={handleComplete} loading={submitting} error={otpError} />
      {error && (
        <p role="alert" className="text-center text-[13px] text-[#FF8A98]">
          {error}
        </p>
      )}
      {onCancel && (
        <button type="button" onClick={onCancel} className="btn-glass !min-h-[42px] w-full">
          Sign out
        </button>
      )}
    </div>
  )
}
