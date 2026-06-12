export const UAS_SILHOUETTE_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="%2306B6D4" d="M4 16 L12 12 L16 4 L20 12 L28 16 L20 20 L16 28 L12 20 Z"/><circle cx="16" cy="16" r="3" fill="%23F97316"/></svg>'
)}`

export const SHIELD_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="%23F97316" d="M16 2 L28 8 V16 C28 23 22 28 16 30 C10 28 4 23 4 16 V8 Z"/></svg>'
)}`

export const PIN_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path fill="%23F97316" d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 32 12 32 S24 21 24 12 C24 5.4 18.6 0 12 0 Z"/><circle cx="12" cy="12" r="5" fill="%230A0A0F"/></svg>'
)}`

export function windArrowSvg(rotationDeg: number): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" style="transform:rotate(${rotationDeg}deg)"><path fill="%2306B6D4" d="M20 4 L26 28 L20 24 L14 28 Z"/></svg>`
  )}`
}
