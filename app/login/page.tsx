'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Radio, ShieldCheck } from 'lucide-react'
import { MfaChallenge } from '@/components/auth/MfaChallenge'
import { MfaEnroll } from '@/components/auth/MfaEnroll'
import { createClient } from '@/lib/supabase/client'
import { getOidcLoginHref, isOidcEnabledClient } from '@/lib/operations/oidc-client'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

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
    <div className="hub-page-canvas relative flex min-h-[calc(100vh-20px)] items-center justify-center overflow-y-auto p-6">
      {/* The shell's ambient light (see --ambient), without its black base so the light theme still reads. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 520px at 72% -12%, rgba(41, 151, 255, 0.12), transparent 70%), radial-gradient(800px 480px at -6% -8%, rgba(124, 92, 255, 0.08), transparent 65%)',
        }}
      />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="glass-popover relative w-full max-w-[420px] !rounded-[22px] p-8">
        {/* Specular edge: the same top-lit sweep as the shell glass. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 30%)' }}
        />

        <div className="relative">
          {step === 'credentials' && (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-[12px]"
                  style={{
                    background: 'linear-gradient(180deg, #3AA2FF, #1F86EE)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 18px -6px rgba(41,151,255,0.85)',
                  }}
                >
                  <Radio className="theme-keep-white h-5 w-5 text-white" aria-hidden />
                </div>
                <div>
                  <h1 className="store-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--store-ink)]">
                    Spectral
                  </h1>
                  <p className="text-[12px] store-text-muted">Drone threat intelligence</p>
                </div>
              </div>

              <p className="mt-6 text-[14px] leading-relaxed store-text-body">
                {mode === 'login'
                  ? 'Sign in for threat analysis and the wargaming modules.'
                  : 'Create an account for threat analysis and the wargaming modules.'}
              </p>

              {oidcHref ? (
                <>
                  <a href={oidcHref} className="btn-glass primary mt-6 !min-h-[42px] w-full">
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Sign in with organisation SSO
                  </a>
                  <div className="my-5 flex items-center gap-3" role="separator">
                    <div className="h-px flex-1 bg-[var(--glass-line)]" />
                    <span className="text-[11.5px] store-text-muted">or use a local account</span>
                    <div className="h-px flex-1 bg-[var(--glass-line)]" />
                  </div>
                </>
              ) : null}

              <form onSubmit={handleSubmit} className={oidcHref ? 'space-y-4' : 'mt-6 space-y-4'}>
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-[12px] font-medium store-text-body">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-field h-11 w-full px-3.5 text-[14px]"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-[12px] font-medium store-text-body">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-field h-11 w-full px-3.5 text-[14px]"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-[13px] text-[#FF8A98]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`btn-glass ${oidcHref ? '' : 'primary'} !min-h-[42px] w-full disabled:opacity-50`}
                >
                  {loading ? 'Please wait…' : mode === 'login' ? 'Sign in with email' : 'Create account'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="mt-4 text-[13px] text-[var(--wb-blue)] transition-opacity duration-150 hover:opacity-80"
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

          <p className="mt-8 border-t border-[var(--glass-line)] pt-4 text-center font-mono text-[11px] tracking-[0.06em] store-text-muted">
            UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
          </p>
        </div>
      </div>
    </div>
  )
}
