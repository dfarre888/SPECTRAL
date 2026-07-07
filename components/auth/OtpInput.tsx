'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OtpInputProps {
  onComplete: (code: string) => void
  loading?: boolean
  error?: boolean
}

export function OtpInput({ onComplete, loading = false, error = false }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(6).fill(''))
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (error) {
      setDigits(Array(6).fill(''))
      inputsRef.current[0]?.focus()
    }
  }, [error])

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (raw.length === 0) {
      setDigits((prev) => {
        const next = [...prev]
        next[index] = ''
        return next
      })
      return
    }
    const last = raw.slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = last
      const code = next.join('')
      if (code.length === 6 && /^\d{6}$/.test(code)) {
        queueMicrotask(() => onComplete(code))
      }
      return next
    })
    if (index < 5) {
      queueMicrotask(() => inputsRef.current[index + 1]?.focus())
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Backspace') return
    e.preventDefault()
    setDigits((prev) => {
      const next = [...prev]
      if (next[index]) {
        next[index] = ''
        return next
      }
      if (index > 0) {
        next[index - 1] = ''
        queueMicrotask(() => inputsRef.current[index - 1]?.focus())
      }
      return next
    })
  }

  return (
    <div className="relative">
      <div className="flex justify-center gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            disabled={loading}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              'w-10 h-12 text-center text-lg font-mono rounded-xl border bg-black/40 text-white',
              'focus:outline-none focus:border-[var(--store-accent-border)]',
              error ? 'border-red/60' : 'border-[var(--store-line)]',
            )}
          />
        ))}
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0F]/60 rounded-xl">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--store-accent)]" />
        </div>
      )}
    </div>
  )
}
