import type { CesiumModule } from '@/lib/map/cesium-types'

let loadPromise: Promise<CesiumModule> | null = null

/**
 * Load Cesium via script tag — avoids webpack parsing Cesium.js (import.meta).
 * Cesium.js is served from NEXT_PUBLIC_CESIUM_BASE_URL:
 *   - Dev/build default: /_next/static/Cesium (webpack CopyWebpackPlugin)
 *   - Helm / air-gap:     /static/Cesium (copy-cesium-public.mjs → public/)
 */
export function loadCesium(): Promise<CesiumModule> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cesium cannot load during SSR'))
  }

  const w = window as Window & { Cesium?: CesiumModule; CESIUM_BASE_URL?: string }
  if (w.Cesium) return Promise.resolve(w.Cesium)

  if (!loadPromise) {
    w.CESIUM_BASE_URL =
      process.env.NEXT_PUBLIC_CESIUM_BASE_URL ?? '/_next/static/Cesium'

    loadPromise = new Promise((resolve, reject) => {
      const src = `${w.CESIUM_BASE_URL}/Cesium.js`
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-spectral-cesium]'
      )
      if (existing) {
        existing.addEventListener('load', () => {
          if (w.Cesium) resolve(w.Cesium)
          else reject(new Error('Cesium global missing after script load'))
        })
        existing.addEventListener('error', () =>
          reject(new Error('Cesium script failed to load'))
        )
        if (w.Cesium) resolve(w.Cesium)
        return
      }

      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.dataset.spectralCesium = 'true'
      script.onload = () => {
        if (w.Cesium) resolve(w.Cesium)
        else reject(new Error('Cesium global missing after script load'))
      }
      script.onerror = () => reject(new Error(`Failed to load Cesium from ${src}`))
      document.head.appendChild(script)
    })
  }

  return loadPromise
}
