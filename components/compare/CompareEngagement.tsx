'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cuasAssetToSpectrumBlue, resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
import { assessEngagement } from '@/lib/spectrum/engagement'
import type { Platform } from '@/lib/types'

interface CompareEngagementProps {
  platforms: Platform[]
}

/** `.tag` tone per verdict: the outcome for the Blue side. */
const VERDICT_TONE: Record<string, string> = {
  defeat_likely: 'green',
  partial: 'amber',
  detect_only: '',
  no_engagement: 'red',
}

function verdictLabel(v: string): string {
  const s = v.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="store-panel rounded-2xl px-5 py-4">
      <h2 className="text-[15px] font-semibold text-[var(--store-ink)]">Spectrum engagement</h2>
      {children}
    </section>
  )
}

export function CompareEngagement({ platforms }: CompareEngagementProps) {
  const result = useMemo(() => {
    if (platforms.length !== 2) return null
    const [a, b] = platforms
    const red = resolveSpectrumUas(a.id)
    const blue = cuasAssetToSpectrumBlue({
      id: b.id,
      name: b.name,
      categoryLabel: b.category,
      image_url: null,
      defeat_range_m: (b.range_km ?? 5) * 1000,
      defeat_range_km: b.range_km ?? 5,
      defeat_methods: ['RF_jamming', 'kinetic'],
    })
    if (!red) return { error: `${a.name} is not in the SPECTRA catalogue, so no spectrum engagement can be assessed.` }
    const engagement = assessEngagement(red, blue)
    return { engagement, redName: a.name, blueName: b.name }
  }, [platforms])

  if (platforms.length !== 2) {
    return (
      <Shell>
        <p className="mt-1.5 text-[13px] store-text-body">
          Select exactly two platforms for spectrum engagement analysis.
        </p>
      </Shell>
    )
  }

  if (!result) {
    return (
      <Shell>
        <p className="mt-1.5 text-[13px] store-text-body">Unable to assess engagement.</p>
      </Shell>
    )
  }

  if ('error' in result) {
    return (
      <Shell>
        <p className="mt-1.5 text-[13px] store-text-body">{result.error}</p>
      </Shell>
    )
  }

  const { engagement, redName, blueName } = result

  return (
    <section className="store-panel rounded-2xl px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-[var(--store-ink)]">
          Spectrum engagement{' '}
          <span className="font-normal store-text-muted">
            {redName} vs {blueName}
          </span>
        </h2>
        <span className={`tag ${VERDICT_TONE[engagement.verdict] ?? ''}`}>{verdictLabel(engagement.verdict)}</span>
      </div>
      <p className="mt-3 text-[15px] leading-snug text-[var(--store-ink)]">{engagement.headline}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed store-text-body max-w-[90ch]">{engagement.detail}</p>

      {engagement.overlaps.length > 0 ? (
        <table className="dt compact mt-4 rounded-xl overflow-hidden border border-[var(--lacquer-line)]">
          <caption className="sr-only">Band overlaps</caption>
          <thead>
            <tr>
              <th scope="col" className="!static">
                Dependency <span className="font-normal store-text-muted">({redName})</span>
              </th>
              <th scope="col" className="!static">
                Covered by <span className="font-normal store-text-muted">({blueName})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {engagement.overlaps.map((o, i) => (
              <tr key={i}>
                <td className="font-mono text-[12.5px] text-[var(--store-ink)]">{o.redCapability.label}</td>
                <td className="font-mono text-[12.5px]">{o.blueCapability.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <Link href="/map" className="fc-action mt-3">
        Open Map Intel for propagation adjudication <ArrowUpRight size={13} aria-hidden />
      </Link>
    </section>
  )
}
