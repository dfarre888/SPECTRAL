'use client'

/**
 * Talk graph: who reaches whom on a net. Force layout in d3, painted as SVG.
 * Islands cluster; gateway units get a dashed ring; nodes that fall off under
 * GNSS denial fade. Under reduced motion the simulation is settled before paint.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import type { ConnTier } from '@/lib/coalition/datalink-matrix'
import type { InteropIsland, InteropNet } from '@/lib/coalition/interop'

interface Node extends SimulationNodeDatum {
  id: string
  label: string
  side: ForceCatalogPlatformFull['force_side']
  gateway: boolean
  island: number
}
interface Link extends SimulationLinkDatum<Node> {
  island: number
}

const TIER_FILL: Record<ConnTier, string> = { track: 'var(--store-accent)', data: '#2997FF', voice: '#8A8A8E', none: 'transparent' }
const W = 340
const H = 260

export function TalkGraph({
  net,
  islands,
  platforms,
  tier,
  fadedIds,
  onSelect,
}: {
  net: InteropNet
  islands: InteropIsland[]
  platforms: ForceCatalogPlatformFull[]
  tier: ConnTier
  fadedIds: Set<string>
  onSelect: (p: ForceCatalogPlatformFull) => void
}) {
  const byId = useMemo(() => new Map(platforms.map((p) => [p.id, p])), [platforms])
  const { nodes, links } = useMemo(() => {
    const members = new Set(net.memberIds)
    const relevant = islands.filter((i) => i.netKeys.includes(net.key))
    const nodes: Node[] = []
    const links: Link[] = []
    relevant.forEach((isl, idx) => {
      const ids = isl.memberIds.filter((id) => byId.has(id))
      for (const id of ids) {
        const p = byId.get(id)!
        nodes.push({ id, label: p.short_name, side: p.force_side, gateway: p.comms.some((c) => c.gateway_capable), island: idx })
      }
      // Star from each member to the island's gateway (or first member): O(n) edges, reads as a net.
      const hub = ids.find((id) => byId.get(id)!.comms.some((c) => c.gateway_capable)) ?? ids[0]
      for (const id of ids) if (id !== hub && members.has(id)) links.push({ source: id, target: hub, island: idx })
    })
    return { nodes, links }
  }, [net, islands, byId])

  const [positions, setPositions] = useState<Node[]>([])
  const simRef = useRef<ReturnType<typeof forceSimulation<Node>> | null>(null)

  useEffect(() => {
    const sim = forceSimulation<Node>(nodes)
      .force('charge', forceManyBody().strength(-55))
      .force('link', forceLink<Node, Link>(links).id((d) => d.id).distance(34).strength(0.6))
      .force('collide', forceCollide(13))
      .force('center', forceCenter(W / 2, H / 2))
      .alphaDecay(0.08)
    simRef.current = sim
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      sim.stop()
      sim.tick(300)
      setPositions([...nodes])
    } else {
      sim.on('tick', () => setPositions([...nodes]))
    }
    return () => {
      sim.stop()
    }
  }, [nodes, links])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[260px] block rounded-lg bg-[var(--store-bg)] border store-line" role="img" aria-label={`Talk graph for ${net.label}`}>
      {links.map((l, i) => {
        const s = l.source as Node
        const t = l.target as Node
        if (s.x == null || t.x == null) return null
        const faded = fadedIds.has(s.id) || fadedIds.has(t.id)
        return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="var(--store-line)" strokeWidth={1} opacity={faded ? 0.25 : 1} />
      })}
      {positions.map((n) => {
        const faded = fadedIds.has(n.id)
        const x = Math.max(12, Math.min(W - 12, n.x ?? W / 2))
        const y = Math.max(12, Math.min(H - 12, n.y ?? H / 2))
        return (
          <g key={n.id} transform={`translate(${x},${y})`} opacity={faded ? 0.3 : 1} style={{ transition: 'opacity 250ms ease-out' }} className="cursor-pointer" onClick={() => { const p = byId.get(n.id); if (p) onSelect(p) }}>
            {n.gateway ? <circle r={9} fill="none" stroke="var(--store-ink-soft)" strokeDasharray="2 2" strokeWidth={1} /> : null}
            <circle r={5} fill={TIER_FILL[tier]} stroke={n.side === 'red' ? '#8A8A8E' : 'var(--store-bg)'} strokeWidth={1.5} />
            <title>{`${n.label}${n.gateway ? ' · gateway' : ''}${faded ? ' · drops out under GNSS denial' : ''}`}</title>
            <text y={16} textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono, monospace" fill="var(--store-ink-mute)">{n.label.length > 10 ? `${n.label.slice(0, 9)}…` : n.label}</text>
          </g>
        )
      })}
    </svg>
  )
}
