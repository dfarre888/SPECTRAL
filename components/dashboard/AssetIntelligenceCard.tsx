'use client'

import Link from 'next/link'
import { Battery, ExternalLink, ShieldCheck } from 'lucide-react'
import type { DashboardCopy } from '@/lib/dashboard/adapters'
import type { TrackedAsset } from '@/lib/dashboard/types'
import { StorePanel } from '@/components/ui/store-surface'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { cn } from '@/lib/utils'

const JSA_STYLES = {
  approved: 'green',
  pending: 'amber',
  required: 'red',
} as const

export function AssetIntelligenceCard({ asset, copy }: { asset: TrackedAsset; copy: DashboardCopy }) {
  const batteryTone =
    asset.batteryHealthPct >= 80 ? 'bg-emerald-500' : asset.batteryHealthPct >= 50 ? 'bg-amber-400' : 'bg-red-500'

  return (
    <StorePanel className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium store-text-muted">{copy.assetPanelTitle}</p>
        <StatusBadge status={asset.status} />
      </div>
      <div className="mt-2 mb-5 min-w-0">
        <h3 className="text-[16px] font-semibold text-[var(--store-ink)] leading-snug">{asset.designation}</h3>
        <p className="text-[12px] font-mono store-text-muted mt-0.5">{asset.serialNumber}</p>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <div className="flex items-center justify-between text-[12px] store-text-muted mb-1.5">
            <span className="inline-flex items-center gap-1">
              <Battery className="w-3 h-3" />
              {copy.batteryLabel}
            </span>
            <span className="font-mono text-[var(--store-ink)]">{asset.batteryHealthPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', batteryTone)} style={{ width: `${asset.batteryHealthPct}%` }} />
          </div>
          <p className="text-[11.5px] store-text-muted mt-1.5"><span className="font-mono">{asset.batteryCycles}</span> cycles logged</p>
        </div>

        <div className="store-panel-inner rounded-xl p-3.5">
          <p className="text-[12px] store-text-muted mb-1.5">{copy.payloadLabel}</p>
          <p className="text-[13px] text-[var(--store-ink)]">{asset.payloadProfile}</p>
          <span className={cn('tag mt-2.5', asset.payloadActive ? 'green' : '')}>
            {asset.payloadActive ? 'Payload active' : 'Payload stowed'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="store-text-muted">{copy.operatorLabel}</span>
          <span className="text-[var(--store-ink)]">{asset.operator}</span>
        </div>

        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="store-text-muted">{copy.jsaLabel}</span>
          <span className={cn('tag capitalize', JSA_STYLES[asset.jsaStatus])}>
            <ShieldCheck className="w-3 h-3 shrink-0" aria-hidden />
            {asset.jsaStatus}
          </span>
        </div>
      </div>

      {asset.platformHref && (
        <Link
          href={asset.platformHref}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--wb-blue)] hover:underline underline-offset-2"
        >
          <ExternalLink className="w-3 h-3" />
          Open platform dossier
        </Link>
      )}
    </StorePanel>
  )
}
