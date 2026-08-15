import compatibilityJson from '@/data/a3dm/compatibility.json'
import dronesJson from '@/data/a3dm/drones.json'
import manufacturersJson from '@/data/a3dm/manufacturers.json'
import payloadsJson from '@/data/a3dm/payloads.json'
import type {
  A3dmCompatibility,
  A3dmDrone,
  A3dmManufacturer,
  A3dmPayload,
} from '@/lib/a3dm/types'

export const A3DM_MANUFACTURERS = manufacturersJson as A3dmManufacturer[]
export const A3DM_DRONES = dronesJson as A3dmDrone[]
export const A3DM_PAYLOADS = payloadsJson as A3dmPayload[]
export const A3DM_COMPATIBILITY = compatibilityJson as A3dmCompatibility[]

const droneById = new Map(A3DM_DRONES.map((d) => [d.id, d]))
const droneByA3dm = new Map(A3DM_DRONES.map((d) => [d.a3dm_drone_id, d]))
const payloadById = new Map(A3DM_PAYLOADS.map((p) => [p.id, p]))

export function getA3dmDrone(id: string): A3dmDrone | undefined {
  return droneById.get(id) ?? droneByA3dm.get(id)
}

export function getA3dmPayload(id: string): A3dmPayload | undefined {
  return payloadById.get(id)
}

export function payloadsForPlatform(platformId: string): A3dmPayload[] {
  return A3DM_COMPATIBILITY
    .filter((c) => c.platform_id === platformId)
    .map((c) => payloadById.get(c.payload_id))
    .filter((p): p is A3dmPayload => Boolean(p))
}

export function isA3dmPlatformId(id: string): boolean {
  return droneById.has(id) || droneByA3dm.has(id)
}
