'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ParticipantNavProps {
  participantId: string
}

export function ParticipantNav({ participantId }: ParticipantNavProps) {
  const pathname = usePathname()
  const base = `/participants/${participantId}`
  const tabs = [
    { href: base, label: 'Profile' },
    { href: `${base}/iep`, label: 'School Plan (IEP)' },
  ]

  return (
    <nav className="flex gap-2 mb-6 border-b border-[var(--store-line)] pb-2">
      {tabs.map(({ href, label }) => {
        const active =
          href === base ? pathname === base : pathname.startsWith(`${base}/iep`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors',
              active
                ? 'border-[var(--store-accent-border)] text-[var(--store-accent)] bg-[var(--store-accent-glow)]'
                : 'border-transparent store-text-muted hover:text-white',
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
