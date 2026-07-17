'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Radio, ShieldCheck } from 'lucide-react'
import { MfaChallenge } from '@/components/auth/MfaChallenge'
import { MfaEnroll } from '@/components/auth/MfaEnroll'
import { createClient } from '@/lib/supabase/client'
import { getOidcLoginHref, isOidcEnabledClient } from '@/lib/operations/oidc-client'
import { StorePanel } from '@/components/ui/store-surface'

type AuthStep = 'credentials' | 'mfa-enroll' | 'mfa-challenge'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [step, setStep] = useState<AuthStep>('credentials')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const oidcHref = isOidcEnabledClient() ? getOidcLoginHref() : null

  async function resolveMfaStep() {
    const supabase = createClient()
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const hasTotp = (factors?.totp?.length ?? 0) > 0
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (!hasTotp) {
      setStep('mfa-enroll')
      return
    }
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      setStep('mfa-challenge')
      return
    }
    router.push('/')
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    await resolveMfaStep()
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setStep('credentials')
    setPassword('')
  }

  return (
    <div className="hub-page-canvas min-h-[calc(100vh-20px)] flex items-center justify-center p-6">
      <StorePanel className="w-full max-w-md p-8">
        {step === 'credentials' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--store-accent-glow)] border border-[var(--store-accent-border)] flex items-center justify-center">
                <Radio className="w-5 h-5 text-[var(--store-accent)]" />
              </div>
              <div>
                <h1 className="store-display text-xl font-bold text-white">SPECTRAL</h1>
                <p className="text-[10px] font-mono store-text-muted">Drone Threat Intelligence Platform</p>
              </div>
            </div>

            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--store-accent)] mb-1">
              Enterprise access
            </p>
            <p className="text-sm store-text-body mb-6">
              UNCLASSIFIED training tier — authenticate for instructor-grade threat analysis modules.
            </p>

            {oidcHref ? (
              <>
                <a
                  href={oidcHref}
                  className="store-btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 mb-4"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Sign in with organisation SSO
                </a>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex-1 h-px bg-[var(--store-line)]" />
                  <span className="text-[10px] store-text-muted font-mono">LOCAL ACCOUNT</span>
                  <div className="flex-1 h-px bg-[var(--store-line)]" />
                </div>
              </>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs store-text-muted block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full store-panel-inner rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--store-accent-border)]"
                />
              </div>
              <div>
                <label className="text-xs store-text-muted block mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full store-panel-inner rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--store-accent-border)]"
                />
              </div>

              {error && <p className="text-xs text-red">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl border border-[var(--store-line)] text-sm font-medium text-white hover:border-[var(--store-accent-border)] disabled:opacity-50"
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in with email' : 'Create training account'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="mt-4 text-xs text-cyan hover:opacity-80"
            >
              {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </>
        )}

        {step === 'mfa-enroll' && (
          <MfaEnroll
            onEnrolled={() => {
              router.push('/')
              router.refresh()
            }}
            onCancelled={() => {
              router.push('/')
              router.refresh()
            }}
          />
        )}

        {step === 'mfa-challenge' && (
          <MfaChallenge
            onSuccess={() => {
              router.push('/')
              router.refresh()
            }}
            onCancel={handleSignOut}
          />
        )}

        <p className="mt-8 text-center text-[9px] font-mono store-text-muted opacity-70">
          UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
        </p>
      </StorePanel>
    </div>
  )
}
