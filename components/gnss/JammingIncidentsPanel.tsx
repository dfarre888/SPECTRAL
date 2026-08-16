'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { GnssJammingIncident } from '@/lib/gnss/gnss-types'

interface JammingIncidentsPanelProps {
  incidents: GnssJammingIncident[]
}

const TYPE_BADGE: Record<string, string> = {
  broadband: 'bg-orange-500/20 text-orange-400',
  meaconing: 'bg-[var(--store-surface-2)] store-text-body',
  spoofing: 'bg-red-500/20 text-red-400',
  selective: 'bg-cyan-500/20 text-cyan-400',
}

export function JammingIncidentsPanel({ incidents }: JammingIncidentsPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(incidents[0]?.id ?? null)

  const selected = useMemo(
    () => incidents.find((i) => i.id === selectedId) ?? null,
    [incidents, selectedId],
  )

  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl || incidents.length === 0) return

    const width = 480
    const height = 280
    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const projection = d3
      .geoNaturalEarth1()
      .fitExtent(
        [
          [8, 8],
          [width - 8, height - 8],
        ],
        { type: 'Sphere' },
      )

    const path = d3.geoPath(projection)
    const graticule = d3.geoGraticule10()

    svg
      .append('path')
      .datum({ type: 'Sphere' })
      .attr('d', (d) => path(d as d3.GeoPermissibleObjects))
      .attr('fill', '#12121a')
      .attr('stroke', '#27272a')

    svg
      .append('path')
      .datum(graticule)
      .attr('d', (d) => path(d as d3.GeoPermissibleObjects))
      .attr('fill', 'none')
      .attr('stroke', '#1f1f28')
      .attr('stroke-width', 0.5)

    const maxR = Math.max(...incidents.map((i) => i.radius_km ?? 100), 100)

    for (const inc of incidents) {
      const coords = projection([inc.lon, inc.lat])
      if (!coords) continue
      const [cx, cy] = coords
      const r = 6 + ((inc.radius_km ?? 100) / maxR) * 28
      const fill = inc.confirmed ? '#F97316' : '#71717a'
      const opacity = selectedId === inc.id ? 0.55 : 0.28

      svg
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', r)
        .attr('fill', fill)
        .attr('fill-opacity', opacity)
        .attr('stroke', fill)
        .attr('stroke-width', selectedId === inc.id ? 2 : 1)
        .style('cursor', 'pointer')
        .on('click', () => setSelectedId(inc.id))

      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 3).attr('fill', fill)
    }
  }, [incidents, selectedId])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ul className="space-y-2 max-h-[420px] overflow-y-auto">
        {incidents.map((inc) => (
          <li key={inc.id}>
            <button
              type="button"
              onClick={() => setSelectedId(inc.id)}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${
                selectedId === inc.id
                  ? 'border-orange-500/50 bg-orange-500/5'
                  : 'border-[var(--store-line)] bg-[var(--store-surface)] hover:border-[var(--store-accent-border)]'
              }`}
            >
              <p className="text-sm font-medium text-white">{inc.incident_name}</p>
              <p className="text-[10px] font-mono store-text-muted mt-1">
                {new Date(inc.detected_at).toISOString().slice(0, 10)}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${TYPE_BADGE[inc.jamming_type] ?? ''}`}>
                  {inc.jamming_type}
                </span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${
                    inc.confirmed ? 'text-orange-400 bg-orange-500/10' : 'store-text-muted bg-[var(--store-surface-2)]'
                  }`}
                >
                  {inc.confirmed ? 'confirmed' : 'unconfirmed'}
                </span>
                {inc.affected_constellations.map((c) => (
                  <span key={c} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                    {c}
                  </span>
                ))}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--store-line)] bg-[var(--store-surface)] p-2">
          <svg ref={svgRef} className="w-full h-auto" role="img" aria-label="Jamming incident map" />
        </div>
        {selected ? (
          <div className="rounded-xl border border-[var(--store-line)] bg-[var(--store-surface)] p-4 text-xs space-y-2">
            <p className="store-text-body leading-relaxed">{selected.source_ref}</p>
            {selected.platform_impacts.length > 0 ? (
              <ul className="font-mono text-[10px] text-cyan-400 space-y-1">
                {selected.platform_impacts.map((p) => (
                  <li key={`${p.platform_id}-${p.observed_effect}`}>
                    {p.platform_id} → {p.observed_effect}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="store-text-muted font-mono text-[10px]">No platform impacts recorded</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
