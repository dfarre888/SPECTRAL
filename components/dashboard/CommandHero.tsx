'use client'

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import Link from 'next/link'

export interface HeroIncidentPoint {
  id: string
  lat: number
  lon: number
  type: string
  title: string
  occurredAt: string
}

interface CommandHeroProps {
  title: ReactNode
  subtitle: ReactNode
  /** Tab switch rendered above the title (HomeTabSwitch). */
  switcher?: ReactNode
  /** Instrument row, floated over the globe on glass. */
  instruments?: ReactNode
  points: HeroIncidentPoint[]
  /** ISO time of the newest intel bundle, for the caption. */
  bundleAt?: string | null
}

/** Centre of the orthographic globe baked into /assets/home/earth-indopac.webp. */
const LON0 = 128
const LAT0 = -14
const RAD = Math.PI / 180

const TYPE_COLOUR: Record<string, string> = {
  uas_strike: '#FF5C6E',
  strike: '#FF5C6E',
  cruise_strike: '#FF5C6E',
  ballistic_strike: '#FF5C6E',
  swarm: '#FF5C6E',
  gnss_denial: '#22D3EE',
  ew: '#A78BFA',
  naval: '#2997FF',
  isr: '#4ADE80',
  intercept: '#FBBF24',
}

interface Plotted {
  key: string
  x: number
  y: number
  colour: string
  count: number
  label: string
}

/** Orthographic projection onto the baked globe; null on the far side. */
function project(lat: number, lon: number): { x: number; y: number } | null {
  const phi = lat * RAD
  const phi0 = LAT0 * RAD
  const dl = (lon - LON0) * RAD
  const cosc = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dl)
  if (cosc < 0.08) return null
  const x = Math.cos(phi) * Math.sin(dl)
  const y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dl)
  return { x: 50 + 50 * x, y: 50 - 50 * y }
}

/**
 * Home hero. Three planes that move at different rates as the page scrolls:
 * stars (slowest), the Indo-Pacific globe (the subject), and the instrument
 * row on Liquid Glass in front, with the title between stars and globe.
 * The globe is not decoration: each light is an incident on the current
 * OSINT picture, coloured by type. Reduced motion freezes the planes.
 */
export function CommandHero({ title, subtitle, switcher, instruments, points, bundleAt }: CommandHeroProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  const plotted = useMemo<Plotted[]>(() => {
    const groups = new Map<string, Plotted>()
    for (const p of points) {
      const pos = project(p.lat, p.lon)
      if (!pos) continue
      const key = `${p.lat.toFixed(1)},${p.lon.toFixed(1)}`
      const existing = groups.get(key)
      if (existing) {
        existing.count += 1
        continue
      }
      groups.set(key, {
        key,
        x: pos.x,
        y: pos.y,
        colour: TYPE_COLOUR[p.type] ?? '#A1A1A6',
        count: 1,
        label: p.title,
      })
    }
    return [...groups.values()]
  }, [points])

  const inView = plotted.reduce((n, p) => n + p.count, 0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let scroller: HTMLElement | null = root.parentElement
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) {
      scroller = scroller.parentElement
    }
    if (!scroller) return
    const target = scroller
    let frame = 0
    const update = () => {
      frame = 0
      const h = root.offsetHeight || 1
      const p = Math.min(1, Math.max(0, target.scrollTop / h))
      root.style.setProperty('--hp', p.toFixed(4))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    target.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      target.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section
      ref={rootRef}
      className="cmd-hero relative -mt-[72px] -mx-4 md:-mx-7 lg:-mx-10 overflow-hidden"
      aria-label="Operations overview"
    >
      {/* Plane 0: stars */}
      <div aria-hidden className="cmd-hero-stars absolute inset-0" />

      {/* Plane 1: the globe, lit from the upper left, night falling to the lower right */}
      <div aria-hidden className="cmd-hero-globe-wrap absolute">
        <div className="cmd-hero-globe">
          <div className="cmd-hero-atmo" />
          <img src="/assets/home/earth-indopac.webp" alt="" className="cmd-hero-earth" draggable={false} />
          <div className="cmd-hero-night" />
          {plotted.map((p) => (
            <span
              key={p.key}
              className="cmd-hero-dot"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                ['--dot' as string]: p.colour,
                ['--sz' as string]: `${Math.min(14, 5 + Math.sqrt(p.count) * 2.2)}px`,
              }}
              title={p.count > 1 ? `${p.count} incidents · latest: ${p.label}` : p.label}
            />
          ))}
        </div>
      </div>

      {/* Ground fade so the hero melts into the page instead of ending on a line */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,#000_8%,rgba(0,0,0,0.75)_45%,transparent)]" />

      {/* Plane 2: type */}
      <div className="cmd-hero-copy relative z-[2] px-4 md:px-7 lg:px-10 pt-[88px]">
        {switcher ? <div className="mb-8">{switcher}</div> : null}
        <h1 className="page-title !text-[clamp(32px,3.4vw,50px)] max-w-[15ch]">{title}</h1>
        <p className="page-lede !text-[15px] !max-w-[44ch]">{subtitle}</p>
        <p className="mt-5 inline-flex items-center gap-2 text-[12px] store-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C6E] shadow-[0_0_8px_#FF5C6E]" aria-hidden />
          {inView > 0 ? (
            <>
              {inView} OSINT incidents on this hemisphere
              {bundleAt ? <span className="font-mono">· bundle {bundleAt.slice(0, 10)}</span> : null}
              <Link href="/conflict" className="text-[var(--wb-blue)] hover:underline underline-offset-2">
                Open timeline
              </Link>
            </>
          ) : (
            <>No incidents in view. Import an intel bundle to populate the picture.</>
          )}
        </p>
      </div>

      {/* Plane 3: instruments on glass, over the globe */}
      {instruments ? (
        <div className="cmd-hero-instruments relative z-[3] mx-4 md:mx-7 lg:mx-10 mt-14 mb-8 lg-glass !rounded-[20px] px-6">
          {instruments}
        </div>
      ) : null}
    </section>
  )
}
