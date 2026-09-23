'use client'

import { useEffect, useState } from 'react'
import { Loader2, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { OtpInput } from '@/components/auth/OtpInput'

interface MfaEnrollProps {
  onEnrolled: () => void
  onCancelled?: () => void
}

export function MfaEnroll({ onEnrolled, onCancelled }: MfaEnrollProps) {
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Google Authenticator',
        })
        if (enrollErr) throw enrollErr
        setFactorId(data.id)
        setQrCode(data.totp.qr_code)
        setSecret(data.totp.secret)
      } catch (err: unknown) {
        setError((err as Error).message || 'Could not start 2FA setup. Enable TOTP MFA in Supabase Auth settings.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function handleVerify(code: string) {
    if (!factorId) return
    setError('')
    setVerifying(true)
    const supabase = createClient()
    try {
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      })
      if (verifyErr) throw verifyErr
      onEnrolled()
    } catch (err: unknown) {
      setError((err as Error).message || 'Invalid code. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--wb-blue)] motion-reduce:animate-none" aria-label="Starting 2FA setup" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(41,151,255,0.45)] bg-[rgba(41,151,255,0.12)]">
          <Shield className="h-5 w-5 text-[var(--wb-blue)]" aria-hidden />
        </div>
        <div>
          <h2 className="store-display text-[18px] font-semibold text-[var(--store-ink)]">Set up 2FA</h2>
          <p className="mt-0.5 text-[13px] store-text-body">Scan with Google Authenticator, Authy or 1Password.</p>
        </div>
      </div>

      {qrCode && (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl bg-white p-4">
            <img src={qrCode} alt="TOTP QR code for Google Authenticator" className="h-48 w-48" />
          </div>
          {secret && (
            <p className="max-w-xs break-all text-center font-mono text-[12px] store-text-muted">
              Manual key: {secret.replace(/(.{4})/g, '$1 ').trim()}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-center text-[13px] store-text-body">Enter the 6-digit code from your app</p>
        <OtpInput onComplete={handleVerify} loading={verifying} error={!!error && !verifying} />
        {error && (
          <p role="alert" className="text-center text-[13px] text-[#FF8A98]">
            {error}
          </p>
        )}
      </div>

      {onCancelled && (
        <button type="button" onClick={onCancelled} className="btn-glass !min-h-[42px] w-full">
          Skip for now
        </button>
      )}
    </div>
  )
}
