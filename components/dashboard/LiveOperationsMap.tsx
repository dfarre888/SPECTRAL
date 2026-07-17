'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MapPin, Maximize2 } from 'lucide-react'
import type { DashboardCopy } from '@/lib/dashboard/adapters'
import type { LiveMapContext } from '@/lib/dashboard/types'
import { StorePanel } from '@/components/ui/store-surface'
import { StatusBadge } from '@/components/dashboard/StatusBadge'

const MiniCesiumPreview = dynamic(
  () => import('@/components/dashboard/MiniCesiumPreview').then((m) => m.MiniCesiumPreview),
  { ssr: false, loading: () => null },
)

export function LiveOperationsMap({
  context,
  copy,
  recentPlanId,
  mapCenter,
  useCesiumPreview = true,
}: {
  context: LiveMapContext
  copy: DashboardCopy
  recentPlanId?: string
  mapCenter?: { lon: number; lat: number }
  useCesiumPreview?: boolean
}) {
  const mapHref = recentPlanId ? `/map?plan=${recentPlanId}` : '/map'

  return (
    <StorePanel className="p-6 h-full flex flex-col border-[var(--store-line)] overflow-hidden">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan">{copy.mapPanelTitle}</p>
          <p className="text-xs store-text-body mt-1">{copy.mapPanelSubtitle}</p>
        </div>
        <Link
          href={mapHref}
          className="inline-flex items-center gap-1 rounded-lg border border-cyan/30 bg-cyan/10 px-2 py-1 text-[10px] font-mono text-cyan hover:bg-cyan/15 transition-colors"
        >
          <Maximize2 className="w-3 h-3" />
          Open Map Intel
        </Link>
      </div>

      <div className="relative flex-1 min-h-[320px] rounded-xl border border-[var(--store-line)] bg-[#0A0A0F] overflow-hidden">
        {useCesiumPreview && (
          <MiniCesiumPreview center={mapCenter} tracks={context.tracks} className="absolute inset-0" />
        )}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(6,182,212,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {!useCesiumPreview && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden>
            <polyline
              points="40,180 120,140 200,100 280,90 360,70"
              fill="none"
              stroke="rgba(249,115,22,0.85)"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <circle cx="360" cy="70" r="6" fill="#F97316" />
          </svg>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 z-10">
          <StatusBadge status="in-flight" />
          <span className="inline-flex items-center gap-1 rounded-md border border-[var(--store-line)] bg-black/50 px-2 py-0.5 text-[10px] font-mono store-text-muted">
            <MapPin className="w-3 h-3 text-cyan" />
            {context.geofenceCount} geofences
          </span>
          {recentPlanId && (
            <span className="text-[9px] font-mono store-text-muted bg-black/40 px-2 py-0.5 rounded border border-[var(--store-line)]">
              Plan linked
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: 'In-Flight', value: context.inFlight, status: 'in-flight' as const },
          { label: 'Pre-Flight', value: context.preFlight, status: 'pre-flight' as const },
          { label: 'Idle', value: context.idle, status: 'idle' as const },
        ].map(({ label, value, status }) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--store-line)] bg-[var(--store-surface-2)] px-3 py-2 text-center"
          >
            <p className="text-lg font-bold font-mono text-white">{value}</p>
            <StatusBadge status={status} className="mt-1 mx-auto" />
            <p className="text-[9px] font-mono store-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>
    </StorePanel>
  )
}
