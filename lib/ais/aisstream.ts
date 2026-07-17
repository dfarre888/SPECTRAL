/**
 * AISStream.io WebSocket snapshot client (server-side only).
 *
 * AISStream has no REST bbox API — we open a short-lived WebSocket,
 * subscribe with BoundingBoxes, collect PositionReports, then close.
 */

import WebSocket from 'ws'
import type { AisBbox, AisVessel } from '@/lib/ais/types'
import { normaliseAisStreamMessage } from '@/lib/ais/types'

const AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream'
const DEFAULT_SAMPLE_MS = 5000
const DEFAULT_MAX_VESSELS = 1200

type CacheEntry = { expiresAt: number; vessels: AisVessel[] }

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<AisVessel[]>>()

function bboxKey(bbox: AisBbox): string {
  return `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`
}

/** Sample live AIS positions from AISStream for a bounding box. */
export async function fetchAisStreamVessels(
  apiKey: string,
  bbox: AisBbox,
  opts?: { sampleMs?: number; maxVessels?: number; cacheSeconds?: number },
): Promise<AisVessel[]> {
  const sampleMs = opts?.sampleMs ?? DEFAULT_SAMPLE_MS
  const maxVessels = opts?.maxVessels ?? DEFAULT_MAX_VESSELS
  const cacheSeconds = opts?.cacheSeconds ?? 120
  const key = bboxKey(bbox)
  const now = Date.now()

  const cached = cache.get(key)
  if (cached && cached.expiresAt > now) return cached.vessels

  const pending = inflight.get(key)
  if (pending) return pending

  const task = sampleAisStream(apiKey, bbox, sampleMs, maxVessels)
    .then((vessels) => {
      cache.set(key, { expiresAt: Date.now() + cacheSeconds * 1000, vessels })
      return vessels
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, task)
  return task
}

function sampleAisStream(
  apiKey: string,
  bbox: AisBbox,
  sampleMs: number,
  maxVessels: number,
): Promise<AisVessel[]> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(AISSTREAM_URL)
    const byMmsi = new Map<string, AisVessel>()
    let settled = false

    const finish = (err?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        ws.close()
      } catch {
        /* ignore */
      }
      if (err) reject(err)
      else resolve([...byMmsi.values()])
    }

    const timer = setTimeout(() => finish(), sampleMs)

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: [[[bbox.minLat, bbox.minLon], [bbox.maxLat, bbox.maxLon]]],
          FilterMessageTypes: [
            'PositionReport',
            'StandardClassBPositionReport',
            'ExtendedClassBPositionReport',
          ],
        }),
      )
    })

    ws.on('message', (data) => {
      let raw: Record<string, unknown>
      try {
        raw = JSON.parse(data.toString()) as Record<string, unknown>
      } catch {
        return
      }

      if (typeof raw.error === 'string') {
        finish(new Error(raw.error))
        return
      }

      const vessel = normaliseAisStreamMessage(raw)
      if (!vessel?.mmsi) return
      byMmsi.set(vessel.mmsi, vessel)
      if (byMmsi.size >= maxVessels) finish()
    })

    ws.on('error', (err) => finish(err instanceof Error ? err : new Error(String(err))))

    ws.on('close', () => {
      if (!settled) finish()
    })
  })
}
