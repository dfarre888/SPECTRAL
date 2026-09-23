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
    <StorePanel className="p-5 h-full flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="wb-pane-title !text-[15px]">{copy.mapPanelTitle}</p>
          <p className="text-[12.5px] store-text-muted mt-0.5">{copy.mapPanelSubtitle}</p>
        </div>
        <Link href={mapHref} className="btn-glass !min-h-[30px] !px-3 !text-[12px]">
          <Maximize2 className="w-3.5 h-3.5" />
          Open Map Intel
        </Link>
      </div>

      <div className="relative flex-1 min-h-[320px] rounded-xl border border-[var(--store-line)] bg-[var(--store-bg)] overflow-hidden">
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
              stroke="rgba(41,151,255,0.85)"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <circle cx="360" cy="70" r="6" fill="#2997FF" />
          </svg>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 z-10">
          <StatusBadge status="in-flight" />
          <span className="tag lg-glass !rounded-full">
            <MapPin className="w-3 h-3 text-[#22D3EE]" />
            <span className="font-mono">{context.geofenceCount}</span> geofences
          </span>
          {recentPlanId && <span className="tag lg-glass !rounded-full">Plan linked</span>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 border-t fc-hair">
        {[
          { label: 'In flight', value: context.inFlight, status: 'in-flight' as const },
          { label: 'Pre-flight', value: context.preFlight, status: 'pre-flight' as const },
          { label: 'Idle', value: context.idle, status: 'idle' as const },
        ].map(({ label, value, status }) => (
          <div key={label} className="pt-3 pb-1 pl-3 first:pl-0 border-l first:border-l-0 fc-hair">
            <p className="text-[24px] leading-none font-semibold store-display tabular-nums text-[var(--store-ink)]">{value}</p>
            <p className="mt-1.5 text-[12px] store-text-muted inline-flex items-center gap-1.5">
              <span className={status === 'in-flight' ? 'w-1.5 h-1.5 rounded-full bg-[#4ADE80]' : status === 'pre-flight' ? 'w-1.5 h-1.5 rounded-full bg-[#A78BFA]' : 'w-1.5 h-1.5 rounded-full bg-[var(--store-ink-mute)]'} aria-hidden />
              {label}
            </p>
          </div>
        ))}
      </div>
    </StorePanel>
  )
}
