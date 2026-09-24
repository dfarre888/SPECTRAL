/**
 * Deterministic UUID-shaped handles for export formats.
 *
 * MSDL references every object by a UUID (ObjectHandle). Deriving the handle
 * from the scenario id and the object's own id means re-exporting the same
 * scenario yields the same handles, so a federation's mapping tables stay
 * valid between exports. Not cryptographic; collisions are only a concern
 * across billions of objects.
 */

/** cyrb128: four 32-bit lanes of a fast string hash. */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  h1 ^= h2 ^ h3 ^ h4
  h2 ^= h1
  h3 ^= h1
  h4 ^= h1
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]
}

const hex8 = (n: number) => n.toString(16).padStart(8, '0')

/** Lower-case 8-4-4-4-12 handle (version nibble 5, RFC 4122 variant) derived from `key`. */
export function stableUuid(key: string): string {
  const [a, b, c, d] = cyrb128(key)
  const h = hex8(a) + hex8(b) + hex8(c) + hex8(d)
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
