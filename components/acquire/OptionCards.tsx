'use client'

import type { RankedAcquireOption } from '@/lib/acquire/acquire-types'
import Link from 'next/link'
import { ConfidenceBadge } from '@/components/platforms/ConfidenceBadge'
import { StorePanel } from '@/components/ui/store-surface'

interface OptionCardsProps {
  options: RankedAcquireOption[]
  threatId: string
}

export function OptionCards({ options, threatId }: OptionCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {options.map((option) => (
        <StorePanel key={option.defeat_system_id} className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-mono store-text-muted">OPTION {option.rank}</p>
              <h3 className="text-sm font-semibold text-white mt-1">{option.defeat_system_name}</h3>
            </div>
            <ConfidenceBadge confidence={option.effectiveness_confidence} />
          </div>

          <div className="font-mono text-xs space-y-1 tabular-nums">
            <p className="text-cyan">
              $/effect: ${Math.round(option.cost_per_expected_kill_usd).toLocaleString('en-US')}
            </p>
            <p className="store-text-body">
              Exchange: {option.exchange.exchangeRatio.toFixed(0)}:1 · Pk {(option.pk * 100).toFixed(0)}% (OSINT)
            </p>
            <p className="store-text-muted">
              Mag {option.magazine_rounds} · reload {option.reload_min} min
            </p>
          </div>

          <p className="text-[11px] store-text-body leading-relaxed flex-1">{option.rationale}</p>

          <p className="text-[10px] font-mono store-text-muted border-t border-[var(--store-line)] pt-2">
            {option.source_ref}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {/*
              Platform Compare loads `platforms` only — defeat_system_id is anti_drone_systems.
              Pair threat UAS with a library peer; open Defeat Matrix for the effector.
            */}
            <Link
              href={`/compare?ids=${encodeURIComponent(threatId)},mq-9-reaper`}
              className="text-[10px] font-mono text-cyan hover:opacity-80"
            >
              Compare threat dossier
            </Link>
            <Link href="/defeat" className="text-[10px] font-mono text-cyan hover:opacity-80">
              Defeat matrix
            </Link>
            {option.is_sam ? (
              <Link href="/overlay" className="text-[10px] font-mono text-cyan hover:opacity-80">
                SAM overlay
              </Link>
            ) : null}
            <span className="text-[10px] font-mono store-text-muted ml-auto">
              {option.cost_confidence}
            </span>
          </div>
        </StorePanel>
      ))}
    </div>
  )
}
