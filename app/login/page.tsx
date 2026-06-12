'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { StorePanel } from '@/components/ui/store-surface'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

    router.push('/')
    router.refresh()
  }

  return (
    <div className="hub-page-canvas min-h-[calc(100vh-20px)] flex items-center justify-center p-6">
      <StorePanel className="w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-purple/15 border border-purple/35 flex items-center justify-center">
            <Radio className="w-4 h-4 text-purple" />
          </div>
          <div>
            <h1 className="store-display text-xl font-bold text-white">SPECTRAL</h1>
            <p className="text-[10px] font-mono store-text-muted">Drone Threat Intelligence</p>
          </div>
        </div>

        <p className="text-sm store-text-body mb-6">
          {mode === 'login' ? 'Sign in to access intelligence modules' : 'Create a training account'}
        </p>

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
            className="store-btn-primary w-full py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="mt-4 text-xs text-cyan hover:opacity-80"
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>

        <p className="mt-8 text-center text-[9px] font-mono store-text-muted opacity-70">
          Powered by A3DM
        </p>
      </StorePanel>
    </div>
  )
}
