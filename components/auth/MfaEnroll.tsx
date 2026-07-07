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
      setError((err as Error).message || 'Invalid code — try again')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--store-accent)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-[var(--store-accent-glow)] border border-[var(--store-accent-border)]">
          <Shield className="w-6 h-6 text-[var(--store-accent)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Set up 2FA</h2>
          <p className="text-sm store-text-muted">Scan with Google Authenticator (or Authy, 1Password)</p>
        </div>
      </div>

      {qrCode && (
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-white rounded-xl">
            <img src={qrCode} alt="TOTP QR code for Google Authenticator" className="w-48 h-48" />
          </div>
          {secret && (
            <p className="text-[10px] font-mono store-text-muted text-center break-all max-w-xs">
              Manual key: {secret.replace(/(.{4})/g, '$1 ').trim()}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs store-text-muted text-center">Enter the 6-digit code from your app</p>
        <OtpInput onComplete={handleVerify} loading={verifying} error={!!error && !verifying} />
        {error && <p className="text-xs text-red text-center">{error}</p>}
      </div>

      {onCancelled && (
        <button
          type="button"
          onClick={onCancelled}
          className="w-full py-2.5 rounded-xl border border-[var(--store-line)] text-sm store-text-muted hover:text-white"
        >
          Skip for now
        </button>
      )}
    </div>
  )
}
