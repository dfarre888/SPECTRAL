'use client'

import type { ReactNode } from 'react'
import type { ForceCatalogPlatformFull, ForceSideCatalog } from '@/lib/bmi/bmi-types'
import { StorePanel } from '@/components/ui/store-surface'

export function toggle<T extends string>(value: T, current: T[], setter: (v: T[]) => void) {
  setter(current.includes(value) ? current.filter((x) => x !== value) : [...current, value])
}

/** Force side as data colour: a dot, never a side stripe. */
export function sideColor(side: ForceSideCatalog): string {
  if (side === 'blue') return 'var(--wb-blue)'
  if (side === 'red') return 'var(--wb-red)'
  return 'var(--wb-neutral)'
}

export function SideDot({ side, className = '' }: { side: ForceSideCatalog; className?: string }) {
  return (
    <i
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${className}`}
      style={{ background: sideColor(side) }}
      aria-hidden
    />
  )
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  side?: ForceSideCatalog
}) {
  return (
    <button type="button" onClick={onClick} className="btn-e sm" aria-pressed={active}>
      {children}
    </button>
  )
}

export function SensorChip({ sensor }: { sensor: ForceCatalogPlatformFull['sensors'][number] }) {
  const sovereign = sensor.performance_ref === 'SOVEREIGN_CORE_BOUNDARY'
  return (
    <span className="tag max-w-full" title={sovereign ? 'Performance resolved in the defence IDE' : undefined}>
      <span className="truncate">{sensor.label}</span>
      {sensor.band ? <span className="font-mono store-text-muted">{sensor.band}</span> : null}
      {sovereign ? <span className="store-text-muted">· defence IDE</span> : null}
    </span>
  )
}

export function CommsChip({ label }: { label: string }) {
  return <span className="tag blue font-mono">{label}</span>
}

export function EmptyState({ message, onClear }: { message: string; onClear: () => void }) {
  return (
    <StorePanel className="space-y-4 p-10 text-center">
      <p className="text-[13px] store-text-body text-pretty">{message}</p>
      <button type="button" onClick={onClear} className="btn-glass">
        Clear filters
      </button>
    </StorePanel>
  )
}
