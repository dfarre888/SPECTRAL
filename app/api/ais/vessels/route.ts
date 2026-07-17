/**
 * /api/ais/vessels — Server-side AIS proxy
 *
 * Keeps your AIS API key server-side only (never exposed to the browser).
 *
 * ── Configuration ───────────────────────────────────────────────────────────
 *
 * 1. Add to .env.local:
 *
 *      # Your AIS provider API key — server-side only, no NEXT_PUBLIC_ prefix
 *      AIS_API_KEY=your_key_here
 *
 *      # Provider endpoint (default is MarineTraffic REST v8)
 *      # AIS_ENDPOINT=https://services.marinetraffic.com/api/exportvessels/v:8
 *
 * 2. MarineTraffic API format is the default.
 *    For other providers, update the URL construction block below.
 *    Common alternatives:
 *      - AISHub:        https://data.aishub.net/vessels.json?username=YOUR_USER&format=1&output=json
 *      - VesselFinder:  https://api.vesselwatch.net/vessels?apikey=KEY
 *      - Spire:         https://api.spire-maritime.com/vessel-tracks
 *
 * ── Query parameters ─────────────────────────────────────────────────────────
 *
 *   GET /api/ais/vessels?minLon=110&maxLon=155&minLat=-45&maxLat=-10
 *
 *   All four bbox params are optional; defaults cover Australian coastal waters.
 *
 * ── Response ─────────────────────────────────────────────────────────────────
 *
 *   { vessels: AisVessel[] }   — normalised array, empty on error
 *   { error: string }          — if AIS_API_KEY not set or upstream failed
 */

import { NextRequest, NextResponse } from 'next/server'
import { normaliseMarineTraffic } from '@/lib/ais/types'

// ── PLACEHOLDER: set AIS_API_KEY in .env.local ───────────────────────────────
const AIS_API_KEY  = process.env.AIS_API_KEY  ?? ''
const AIS_ENDPOINT = process.env.AIS_ENDPOINT
  ?? 'https://services.marinetraffic.com/api/exportvessels/v:8'

// Cache duration — AIS data is typically updated every 2–5 minutes
const CACHE_SECONDS = 120

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // ── Guard: key not configured ─────────────────────────────────────────────
  if (!AIS_API_KEY) {
    return NextResponse.json(
      {
        error:  'AIS_API_KEY not configured',
        detail: 'Add AIS_API_KEY=your_key to .env.local (server-side only, no NEXT_PUBLIC_ prefix)',
        vessels: [],
      },
      { status: 503 },
    )
  }

  // ── Parse bounding box from query params ──────────────────────────────────
  const { searchParams } = new URL(req.url)
  const minLat = searchParams.get('minLat') ?? '-45'
  const maxLat = searchParams.get('maxLat') ?? '-10'
  const minLon = searchParams.get('minLon') ?? '110'
  const maxLon = searchParams.get('maxLon') ?? '155'

  try {
    // ── MarineTraffic REST v8 ─────────────────────────────────────────────
    // Docs: https://www.marinetraffic.com/en/ais-api-service/documentation/
    //
    // PLACEHOLDER: Replace this URL block if using a different provider.
    //              AisVessel normalisation happens in normaliseMarineTraffic()
    //              in lib/ais/types.ts — update that function to match your
    //              provider's field names if they differ from MarineTraffic.
    const url = new URL(AIS_ENDPOINT)
    url.searchParams.set('v',       '8')
    url.searchParams.set('apikey',  AIS_API_KEY)
    url.searchParams.set('MINLAT',  minLat)
    url.searchParams.set('MAXLAT',  maxLat)
    url.searchParams.set('MINLON',  minLon)
    url.searchParams.set('MAXLON',  maxLon)
    url.searchParams.set('protocol', 'jsono')  // JSON output

    const upstream = await fetch(url.toString(), {
      next: { revalidate: CACHE_SECONDS },
      headers: { 'Accept': 'application/json' },
    })

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => '')
      console.error('[AIS] upstream error:', upstream.status, body.slice(0, 200))
      return NextResponse.json(
        { error: `AIS upstream returned ${upstream.status}`, vessels: [] },
        { status: 502 },
      )
    }

    // MarineTraffic returns an array of vessel objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await upstream.json()

    // Normalise — handle both array-root and {data:[]} shapes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawArray: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.vessels ?? [])
    const vessels = rawArray.map(normaliseMarineTraffic)

    return NextResponse.json(
      { vessels },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
        },
      },
    )
  } catch (err) {
    console.error('[AIS] fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch AIS data', detail: String(err), vessels: [] },
      { status: 502 },
    )
  }
}
