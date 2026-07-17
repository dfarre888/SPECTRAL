/**
 * /api/ais/vessels — Server-side AIS proxy
 *
 * Keeps your AIS API key server-side only (never exposed to the browser).
 *
 * ── Configuration (.env.local) ───────────────────────────────────────────────
 *
 *   AIS_API_KEY=your_key_here
 *   AIS_PROVIDER=aisstream          # default — aisstream.io WebSocket key
 *   AIS_PROVIDER=marinetraffic      # MarineTraffic REST exportvessels
 *
 *   # MarineTraffic only:
 *   AIS_ENDPOINT=https://services.marinetraffic.com/api/exportvessels/v:8
 *
 * ── Query parameters ─────────────────────────────────────────────────────────
 *
 *   GET /api/ais/vessels?minLon=-180&maxLon=180&minLat=-90&maxLat=90
 *
 *   All four bbox params optional; defaults = global [[-90,-180],[90,180]].
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchAisStreamVessels } from '@/lib/ais/aisstream'
import { AIS_DEFAULT_BBOX, normaliseMarineTraffic, type AisBbox } from '@/lib/ais/types'

const AIS_API_KEY = process.env.AIS_API_KEY ?? ''
const AIS_PROVIDER = (process.env.AIS_PROVIDER ?? 'aisstream').toLowerCase()
const AIS_ENDPOINT =
  process.env.AIS_ENDPOINT ?? 'https://services.marinetraffic.com/api/exportvessels/v:8'

const CACHE_SECONDS = 120

export const runtime = 'nodejs'

function parseBbox(searchParams: URLSearchParams): AisBbox {
  return {
    minLat: Number(searchParams.get('minLat') ?? AIS_DEFAULT_BBOX.minLat),
    maxLat: Number(searchParams.get('maxLat') ?? AIS_DEFAULT_BBOX.maxLat),
    minLon: Number(searchParams.get('minLon') ?? AIS_DEFAULT_BBOX.minLon),
    maxLon: Number(searchParams.get('maxLon') ?? AIS_DEFAULT_BBOX.maxLon),
  }
}

async function fetchMarineTraffic(bbox: AisBbox) {
  const url = new URL(AIS_ENDPOINT)
  url.searchParams.set('v', '8')
  url.searchParams.set('apikey', AIS_API_KEY)
  url.searchParams.set('MINLAT', String(bbox.minLat))
  url.searchParams.set('MAXLAT', String(bbox.maxLat))
  url.searchParams.set('MINLON', String(bbox.minLon))
  url.searchParams.set('MAXLON', String(bbox.maxLon))
  url.searchParams.set('protocol', 'jsono')

  const upstream = await fetch(url.toString(), {
    next: { revalidate: CACHE_SECONDS },
    headers: { Accept: 'application/json' },
  })

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => '')
    console.error('[AIS] MarineTraffic error:', upstream.status, body.slice(0, 200))
    throw new Error(`MarineTraffic returned ${upstream.status}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await upstream.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawArray: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.vessels ?? [])
  return rawArray.map(normaliseMarineTraffic)
}

export async function GET(req: NextRequest) {
  if (!AIS_API_KEY) {
    return NextResponse.json(
      {
        error: 'AIS_API_KEY not configured',
        detail: 'Add AIS_API_KEY=your_key to .env.local (server-side only)',
        vessels: [],
      },
      { status: 503 },
    )
  }

  const bbox = parseBbox(new URL(req.url).searchParams)

  try {
    const vessels =
      AIS_PROVIDER === 'marinetraffic'
        ? await fetchMarineTraffic(bbox)
        : await fetchAisStreamVessels(AIS_API_KEY, bbox, { cacheSeconds: CACHE_SECONDS })

    return NextResponse.json(
      { vessels, provider: AIS_PROVIDER },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
        },
      },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[AIS] fetch error:', message)
    return NextResponse.json(
      { error: message, vessels: [] },
      { status: 502 },
    )
  }
}
