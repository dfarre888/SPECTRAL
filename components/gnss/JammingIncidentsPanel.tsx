'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { GnssJammingIncident } from '@/lib/gnss/gnss-types'
import { GNSS_CONSTELLATION_LABELS } from '@/lib/gnss/constellation-meta'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'

interface JammingIncidentsPanelProps {
  incidents: GnssJammingIncident[]
}

/** Interference type is data: amber broadband, red spoofing, cyan selective (GNSS), grey meaconing. */
const TYPE_COLOR: Record<string, string> = {
  broadband: '#FBBF24',
  meaconing: 'var(--store-ink-soft)',
  spoofing: 'var(--wb-red)',
  selective: 'var(--wb-data)',
  'spoofing+jamming': 'var(--wb-red)',
}

const CONFIRMED = '#FF5C6E'
const UNCONFIRMED = '#8E8E93'

function constellationLabel(id: string): string {
  return GNSS_CONSTELLATION_LABELS[id] ?? id.toUpperCase()
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
      .style('fill', 'var(--store-bg)')
      .style('stroke', 'var(--lacquer-line)')

    svg
      .append('path')
      .datum(graticule)
      .attr('d', (d) => path(d as d3.GeoPermissibleObjects))
      .attr('fill', 'none')
      .attr('stroke', 'rgba(142,142,147,0.22)')
      .attr('stroke-width', 0.5)

    const maxR = Math.max(...incidents.map((i) => i.radius_km ?? 100), 100)

    // Selected last so it draws on top.
    const ordered = [...incidents].sort((a, b) => (a.id === selectedId ? 1 : 0) - (b.id === selectedId ? 1 : 0))
    for (const inc of ordered) {
      const coords = projection([inc.lon, inc.lat])
      if (!coords) continue
      const [cx, cy] = coords
      const r = 6 + ((inc.radius_km ?? 100) / maxR) * 28
      const fill = inc.confirmed ? CONFIRMED : UNCONFIRMED
      const on = selectedId === inc.id

      svg
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', r)
        .attr('fill', fill)
        .attr('fill-opacity', on ? 0.4 : 0.14)
        .style('stroke', on ? 'var(--store-ink)' : fill)
        .attr('stroke-opacity', on ? 0.9 : 0.6)
        .attr('stroke-width', on ? 1.5 : 1)
        .style('cursor', 'pointer')
        .on('click', () => setSelectedId(inc.id))
        .append('title')
        .text(inc.incident_name)

      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', on ? 3.5 : 2.5).style('fill', on ? 'var(--store-ink)' : fill).style('pointer-events', 'none')
    }
  }, [incidents, selectedId])

  const columns = useMemo<DataColumn<GnssJammingIncident>[]>(() => [
    {
      key: 'name',
      header: 'Incident',
      sortValue: (i) => i.incident_name,
      cell: (i) => (
        <span className="block min-w-0">
          <span className="block text-[13px] text-[var(--store-ink)] leading-snug">{i.incident_name}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] store-text-muted">
            <span className="inline-flex items-center gap-1.5" style={{ color: TYPE_COLOR[i.jamming_type] ?? 'var(--store-ink-mute)' }}>
              <i className="h-1.5 w-1.5 rounded-full" style={{ background: TYPE_COLOR[i.jamming_type] ?? 'var(--store-ink-mute)' }} aria-hidden />
              {i.jamming_type}
            </span>
            <span aria-hidden>·</span>
            <span>{i.affected_constellations.map(constellationLabel).join(', ') || 'no constellation recorded'}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'detected',
      header: 'Detected',
      width: 108,
      sortValue: (i) => i.detected_at,
      cell: (i) => <span className="font-mono text-[12px] tabular-nums store-text-body">{new Date(i.detected_at).toISOString().slice(0, 10)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      sortValue: (i) => (i.confirmed ? 1 : 0),
      cell: (i) => (i.confirmed ? <span className="tag red">Confirmed</span> : <span className="text-[12px] store-text-muted">Unconfirmed</span>),
    },
  ], [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-6 items-start">
      <DataTable
        rows={incidents}
        columns={columns}
        rowKey={(i) => i.id}
        onRowClick={(i) => setSelectedId(i.id)}
        selectedKey={selectedId}
        caption="GNSS jamming and spoofing incidents"
        empty="No jamming incidents on record."
      />
      <div className="space-y-4 min-w-0 lg:sticky lg:top-0">
        <div className="store-panel rounded-2xl p-3">
          <svg ref={svgRef} className="w-full h-auto" role="img" aria-label="Jamming incident map" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 pt-1 pb-1 text-[12px] store-text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: CONFIRMED }} aria-hidden />Confirmed</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: UNCONFIRMED }} aria-hidden />Unconfirmed</span>
            <span className="ml-auto">Circle size is the reported radius</span>
          </div>
        </div>
        {selected ? (
          <section className="store-panel rounded-2xl p-5 space-y-3" aria-label="Incident detail">
            <div>
              <h3 className="text-[16px] store-display font-semibold tracking-[-0.01em] leading-snug text-[var(--store-ink)] m-0 text-balance">{selected.incident_name}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {selected.confirmed ? <span className="tag red">Confirmed</span> : <span className="tag">Unconfirmed</span>}
                <span className="tag" style={{ color: TYPE_COLOR[selected.jamming_type] }}>{selected.jamming_type}</span>
                {selected.affected_constellations.map((c) => <span key={c} className="tag font-mono">{constellationLabel(c)}</span>)}
              </div>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[12px] m-0 pt-3 border-t fc-hair">
              <dt className="store-text-muted">Detected</dt>
              <dd className="m-0 font-mono tabular-nums text-[var(--store-ink)]">{new Date(selected.detected_at).toISOString().slice(0, 10)}</dd>
              {selected.radius_km != null ? (
                <>
                  <dt className="store-text-muted">Reported radius</dt>
                  <dd className="m-0 font-mono tabular-nums text-[var(--store-ink)]">{selected.radius_km.toLocaleString('en-AU')} km</dd>
                </>
              ) : null}
              <dt className="store-text-muted">Position</dt>
              <dd className="m-0 font-mono tabular-nums text-[var(--store-ink)]">{selected.lat.toFixed(2)}, {selected.lon.toFixed(2)}</dd>
            </dl>
            <p className="text-[13px] store-text-body leading-relaxed m-0 pt-3 border-t fc-hair text-pretty">
              <span className="store-text-muted">Source: </span>{selected.source_ref}
            </p>
            {selected.platform_impacts.length > 0 ? (
              <div>
                <div className="text-[12px] store-text-muted mb-1.5">Platform impacts</div>
                <ul className="m-0 p-0 list-none space-y-1">
                  {selected.platform_impacts.map((p) => (
                    <li key={`${p.platform_id}-${p.observed_effect}`} className="text-[13px] grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3">
                      <span className="font-mono text-[#22D3EE]">{p.platform_id}</span>
                      <span className="store-text-body">{p.observed_effect}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="store-text-muted text-[12px] m-0">No platform impacts recorded.</p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  )
}
