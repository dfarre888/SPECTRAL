'use client'

import type { ReactNode } from 'react'
import type { ForceCatalogPlatformFull, ForceSideCatalog } from '@/lib/bmi/bmi-types'
import { StorePanel } from '@/components/ui/store-surface'

export function toggle<T extends string>(value: T, current: T[], setter: (v: T[]) => void) {
  setter(current.includes(value) ? current.filter((x) => x !== value) : [...current, value])
}

export function sideEdgeClass(side: ForceSideCatalog): string {
  if (side === 'blue') return 'border-l-2 border-l-[var(--store-accent)]'
  if (side === 'red') return 'border-l-2 border-l-[var(--store-line)]'
  return 'border-l-2 border-l-transparent'
}

function sideChipClass(_side: ForceSideCatalog, _active: boolean): string {
  return 'btn-e sm font-mono'
}

export function Chip({
  active,
  onClick,
  children,
  side,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  side?: ForceSideCatalog
}) {
  const className = side ? sideChipClass(side, active) : 'btn-e sm font-mono'

  return (
    <button type="button" onClick={onClick} className={className} aria-pressed={active}>
      {children}
    </button>
  )
}

export function SensorChip({ sensor }: { sensor: ForceCatalogPlatformFull['sensors'][number] }) {
  if (sensor.performance_ref === 'SOVEREIGN_CORE_BOUNDARY') {
    return (
      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded border store-line store-text-muted">
        {sensor.label}
        {sensor.band ? ` · ${sensor.band}` : ''} · resolved in defence IDE
      </span>
    )
  }
  return (
    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded border store-line store-text-muted">
      {sensor.label}
      {sensor.band ? ` · ${sensor.band}` : ''}
    </span>
  )
}

export function CommsChip({ label }: { label: string }) {
  return (
    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded border store-accent-border store-text-body">
      {label}
    </span>
  )
}

export function EmptyState({ message, onClear }: { message: string; onClear: () => void }) {
  return (
    <StorePanel className="glass ring-gradient p-8 text-center space-y-3">
      <p className="text-[11px] font-mono store-text-muted text-pretty">{message}</p>
      <button
        type="button"
        onClick={onClear}
        className="store-btn-primary text-[11px] font-mono px-3 py-2 min-h-10 transition-[filter,transform] duration-150 ease-out active:scale-[0.96]"
      >
        Clear filters
      </button>
    </StorePanel>
  )
}

export function StatChip({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent?: boolean
}) {
  return (
    <span
      className={`px-2.5 py-1.5 rounded-xl border border-[var(--store-line)] bg-[var(--store-surface-2)] text-[11px] font-mono tabular-nums ${
        accent ? 'text-[var(--store-accent)] border-[var(--store-accent-border)]' : 'store-text-muted'
      }`}
    >
      <span className="hero-number text-[#F7F9FC]">{value}</span> {label}
    </span>
  )
}
