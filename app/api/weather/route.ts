import { NextResponse } from 'next/server'

interface WindyResponse {
  'wind_u-surface'?: number[]
  'wind_v-surface'?: number[]
  'wind_u-850h'?: number[]
  'wind_v-850h'?: number[]
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.WINDY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'WINDY_API_KEY not configured' }, { status: 500 })
    }

    const body = await request.json()
    const lat = Number(body.lat)
    const lon = Number(body.lon)

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: 'Invalid lat/lon' }, { status: 400 })
    }

    const res = await fetch('https://api.windy.com/api/point-forecast/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        lat,
        lon,
        model: 'gfs',
        parameters: ['wind_u', 'wind_v'],
        levels: ['surface', '1000h', '850h', '700h'],
        key: apiKey,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[POST /api/weather] Windy error', res.status, text)
      return NextResponse.json({ error: 'Windy API request failed' }, { status: 502 })
    }

    const data = (await res.json()) as WindyResponse
    const u = data['wind_u-850h']?.[0] ?? data['wind_u-surface']?.[0] ?? 0
    const v = data['wind_v-850h']?.[0] ?? data['wind_v-surface']?.[0] ?? 0
    const windSpeed_kmh = Math.sqrt(u * u + v * v) * 3.6
    const windDir_deg = (Math.atan2(-u, -v) * 180) / Math.PI + 180

    return NextResponse.json({
      data: {
        windSpeed_kmh: Math.round(windSpeed_kmh * 10) / 10,
        windDir_deg: Math.round(windDir_deg),
        level: data['wind_u-850h'] ? '850h' : 'surface',
      },
    })
  } catch (error) {
    console.error('[POST /api/weather]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
