'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { GnssJammingIncident } from '@/lib/gnss/gnss-types'

interface JammingIncidentsPanelProps {
  incidents: GnssJammingIncident[]
}

const TYPE_COLOR: Record<string, string> = {
  broadband: 'var(--wb-ir)',
  meaconing: 'var(--store-ink-soft)',
  spoofing: 'var(--wb-red)',
  selective: 'var(--wb-data)',
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
      <ul className="max-h-[520px] overflow-y-auto">
        {incidents.map((inc) => (
          <li key={inc.id}>
            <button
              type="button"
              onClick={() => setSelectedId(inc.id)}
              aria-pressed={selectedId === inc.id}
              className={`w-full text-left px-3 py-3 border-b fc-hair grid grid-cols-[6px_minmax(0,1fr)_auto] gap-x-3 items-start transition-colors duration-150 ${
                selectedId === inc.id ? 'bg-[rgba(41,151,255,0.08)]' : 'hover:bg-[var(--store-surface)]'
              }`}
            >
              <i className="mt-[7px] h-1.5 w-1.5 rounded-full" style={{ background: TYPE_COLOR[inc.jamming_type] ?? 'var(--store-ink-mute)' }} aria-hidden />
              <span className="min-w-0">
                <span className="block text-[13px] text-[var(--store-ink)] truncate">{inc.incident_name}</span>
                <span className="block text-[11px] font-mono store-text-muted mt-0.5">
                  {inc.jamming_type} · {inc.affected_constellations.join(', ') || 'no constellation recorded'}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-[11px] font-mono store-text-muted">{new Date(inc.detected_at).toISOString().slice(0, 10)}</span>
                <span className={`block text-[11px] mt-0.5 ${inc.confirmed ? 'text-[var(--store-ink)]' : 'store-text-muted'}`}>{inc.confirmed ? 'confirmed' : 'unconfirmed'}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--store-line)] p-2">
          <svg ref={svgRef} className="w-full h-auto" role="img" aria-label="Jamming incident map" />
        </div>
        {selected ? (
          <div className="pt-3 border-t fc-hair text-xs space-y-2">
            <p className="store-text-body leading-relaxed">{selected.source_ref}</p>
            {selected.platform_impacts.length > 0 ? (
              <ul className="font-mono text-[11px] text-cyan-400 space-y-1">
                {selected.platform_impacts.map((p) => (
                  <li key={`${p.platform_id}-${p.observed_effect}`}>
                    {p.platform_id} → {p.observed_effect}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="store-text-muted font-mono text-[11px]">No platform impacts recorded</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
