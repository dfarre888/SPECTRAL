'use client'

import type { ReactNode } from 'react'
import type { RankedAcquireOption } from '@/lib/acquire/acquire-types'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { StorePanel } from '@/components/ui/store-surface'

interface OptionCardsProps {
  options: RankedAcquireOption[]
  threatId: string
}

/** Same thresholds as the exchange-ratio doctrine hint. */
function ratioInk(r: number) {
  if (r > 50) return '#FF8A98'
  if (r > 10) return '#FCD34D'
  return 'var(--store-ink)'
}

function Stat({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-[13px] store-text-body">{k}</dt>
      <dd className="font-mono text-[13px] tabular-nums text-[var(--store-ink)]">{children}</dd>
    </div>
  )
}

export function OptionCards({ options, threatId }: OptionCardsProps) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] store-text-body">
        {options.length} options, ranked by cost per expected kill. Pk is OSINT, not accredited.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {options.map((option) => (
          <StorePanel key={option.defeat_system_id} className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs store-text-muted">Option {option.rank}</p>
                <h3 className="mt-1 text-[16px] font-semibold leading-snug text-[var(--store-ink)]">
                  {option.defeat_system_name}
                </h3>
              </div>
              <ConfidenceBadge confidence={option.effectiveness_confidence} className="shrink-0" />
            </div>

            <div>
              <p className="text-xs store-text-muted">Cost per expected kill</p>
              <p className="mt-1.5 font-mono text-[28px] leading-none tabular-nums text-[var(--store-ink)]">
                ${Math.round(option.cost_per_expected_kill_usd).toLocaleString('en-US')}
              </p>
            </div>

            <dl className="divide-y divide-[var(--store-line)] border-y border-[var(--store-line)]">
              <Stat k="Exchange ratio">
                <span style={{ color: ratioInk(option.exchange.exchangeRatio) }}>
                  {option.exchange.exchangeRatio.toFixed(0)}:1
                </span>
              </Stat>
              <Stat k="Pk (OSINT)">{(option.pk * 100).toFixed(0)}%</Stat>
              <Stat k="Magazine">{option.magazine_rounds} rounds</Stat>
              <Stat k="Reload">{option.reload_min} min</Stat>
            </dl>

            <p className="flex-1 text-[13px] leading-relaxed store-text-body">{option.rationale}</p>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-xs leading-relaxed store-text-muted">
                  <span className="sr-only">Source: </span>
                  <span className="font-mono">{option.source_ref}</span>
                </p>
                <span className="tag shrink-0">Cost {option.cost_confidence.toLowerCase()}</span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {/*
                  Platform Compare loads `platforms` only; defeat_system_id is anti_drone_systems.
                  Pair threat UAS with a library peer; open Defeat Matrix for the effector.
                */}
                <Link href={`/compare?ids=${encodeURIComponent(threatId)},mq-9-reaper`} className="fc-action">
                  Compare threat dossier <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                <Link href="/defeat" className="fc-action">
                  Defeat matrix <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                {option.is_sam ? (
                  <Link href="/overlay" className="fc-action">
                    SAM overlay <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                ) : null}
              </div>
            </div>
          </StorePanel>
        ))}
      </div>
    </div>
  )
}
