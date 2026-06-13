'use client'

import { useMemo } from 'react'
import { cuasAssetToSpectrumBlue, resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
import { assessEngagement } from '@/lib/spectrum/engagement'
import { StorePanel } from '@/components/ui/store-surface'
import type { Platform } from '@/lib/types'

interface CompareEngagementProps {
  platforms: Platform[]
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
    if (!red) return { error: `${a.name} not in SPECTRA catalogue` }
    const engagement = assessEngagement(red, blue)
    return { engagement, redName: a.name, blueName: b.name }
  }, [platforms])

  if (platforms.length !== 2) {
    return (
      <StorePanel className="p-4">
        <p className="text-sm store-text-body">
          Select exactly two platforms for spectrum engagement analysis.
        </p>
      </StorePanel>
    )
  }

  if (!result) {
    return (
      <StorePanel className="p-4">
        <p className="text-sm text-amber font-mono">Unable to assess engagement</p>
      </StorePanel>
    )
  }

  if ('error' in result) {
    return (
      <StorePanel className="p-4">
        <p className="text-sm text-amber font-mono">{result.error}</p>
      </StorePanel>
    )
  }

  const { engagement, redName, blueName } = result

  return (
    <StorePanel className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">
        Spectrum engagement — {redName} vs {blueName}
      </h3>
      <p className="text-lg font-mono text-[var(--store-accent)]">{engagement.headline}</p>
      <p className="text-sm store-text-body">{engagement.detail}</p>
      <p className="text-xs store-text-muted font-mono uppercase">
        Verdict: {engagement.verdict.replace(/_/g, ' ')}
      </p>
      {engagement.overlaps.length > 0 && (
        <ul className="text-xs store-text-body space-y-1">
          {engagement.overlaps.map((o, i) => (
            <li key={i} className="font-mono">
              {o.redCapability.label} ∩ {o.blueCapability.label}
            </li>
          ))}
        </ul>
      )}
      <a href="/map" className="text-xs text-cyan hover:underline inline-block">
        Open Map Intel for propagation adjudication →
      </a>
    </StorePanel>
  )
}
