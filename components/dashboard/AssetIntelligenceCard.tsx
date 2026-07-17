'use client'

import Link from 'next/link'
import { Battery, ExternalLink, ShieldCheck } from 'lucide-react'
import type { DashboardCopy } from '@/lib/dashboard/adapters'
import type { TrackedAsset } from '@/lib/dashboard/types'
import { StorePanel } from '@/components/ui/store-surface'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { cn } from '@/lib/utils'

const JSA_STYLES = {
  approved: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  pending: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  required: 'text-red-400 border-red-500/30 bg-red-500/10',
} as const

export function AssetIntelligenceCard({ asset, copy }: { asset: TrackedAsset; copy: DashboardCopy }) {
  const batteryTone =
    asset.batteryHealthPct >= 80 ? 'bg-emerald-500' : asset.batteryHealthPct >= 50 ? 'bg-amber-400' : 'bg-red-500'

  return (
    <StorePanel className="p-6 h-full flex flex-col border-[var(--store-line)]">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--store-accent)]">{copy.assetPanelTitle}</p>
          <h3 className="text-sm font-semibold text-white mt-1 leading-snug">{asset.designation}</h3>
          <p className="text-[10px] font-mono store-text-muted mt-0.5">{asset.serialNumber}</p>
        </div>
        <StatusBadge status={asset.status} />
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono store-text-muted mb-1.5">
            <span className="inline-flex items-center gap-1">
              <Battery className="w-3 h-3" />
              {copy.batteryLabel}
            </span>
            <span className="text-white">{asset.batteryHealthPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--store-surface-2)] overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', batteryTone)} style={{ width: `${asset.batteryHealthPct}%` }} />
          </div>
          <p className="text-[9px] font-mono store-text-muted mt-1">{asset.batteryCycles} cycles logged</p>
        </div>

        <div className="rounded-xl border border-[var(--store-line)] bg-[var(--store-surface-2)] p-3">
          <p className="text-[10px] font-mono store-text-muted uppercase tracking-wider mb-2">{copy.payloadLabel}</p>
          <p className="text-xs text-white">{asset.payloadProfile}</p>
          <span
            className={cn(
              'mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-semibold',
              asset.payloadActive
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-500/40 bg-slate-500/10 text-slate-400',
            )}
          >
            {asset.payloadActive ? 'Payload active' : 'Payload stowed'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="store-text-muted">{copy.operatorLabel}</span>
          <span className="font-mono text-white">{asset.operator}</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-mono font-semibold uppercase tracking-wide',
            JSA_STYLES[asset.jsaStatus],
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          {copy.jsaLabel} {asset.jsaStatus}
        </div>
      </div>

      {asset.platformHref && (
        <Link
          href={asset.platformHref}
          className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-mono text-[var(--store-accent)] hover:opacity-80"
        >
          <ExternalLink className="w-3 h-3" />
          Open platform dossier
        </Link>
      )}
    </StorePanel>
  )
}
