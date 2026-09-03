/**
 * Places comms bearers on the frequency axis.
 *
 * Band allocations below are published military/ITU allocations — the kind of
 * thing printed in a frequency plan. No waveform, hopping pattern, power or
 * keying detail is represented: that stays behind the accredited boundary.
 *
 * Putting bearers on a spectrum axis answers two questions a network diagram
 * cannot:
 *
 *   1. Which links share spectrum, and therefore contend or can be jammed
 *      together. One barrage in 225-400 MHz takes UHF voice and the UHF leg of
 *      Link 22 at the same time.
 *   2. Which links survive when a band is denied — HF is slow and awkward, but
 *      it is nowhere near the jammed UHF stack.
 */

import type { ConnTier } from '@/lib/coalition/datalink-matrix'

export interface SpectrumSpan {
  loMhz: number
  hiMhz: number
}

export interface BearerSpectrum {
  /** Net key this spectrum belongs to, matching InteropNet.key. */
  key: string
  label: string
  tier: ConnTier
  /** A bearer may occupy more than one band (Link 22 runs HF and UHF legs). */
  spans: SpectrumSpan[]
  note: string
}

/** Published allocations, MHz. */
export const BEARER_SPECTRUM: Record<string, BearerSpectrum> = {
  'std:link16': {
    key: 'std:link16', label: 'Link 16', tier: 'track',
    spans: [{ loMhz: 960, hiMhz: 1215 }],
    note: 'Lx band, shared with civil aeronautical radionavigation — hence notching.',
  },
  'std:link22': {
    key: 'std:link22', label: 'Link 22', tier: 'track',
    spans: [{ loMhz: 3, hiMhz: 30 }, { loMhz: 225, hiMhz: 400 }],
    note: 'HF leg for beyond line of sight; UHF leg for line of sight.',
  },
  'std:link11': {
    key: 'std:link11', label: 'Link 11', tier: 'track',
    spans: [{ loMhz: 2, hiMhz: 30 }, { loMhz: 225, hiMhz: 400 }],
    note: 'HF or UHF netted operation.',
  },
  'std:madl': {
    key: 'std:madl', label: 'MADL', tier: 'track',
    spans: [{ loMhz: 14_000, hiMhz: 15_000 }],
    note: 'Ku-band directional. Narrow beams are hard to intercept and hard to jam.',
  },
  'std:ifdl': {
    key: 'std:ifdl', label: 'IFDL', tier: 'track',
    spans: [{ loMhz: 14_000, hiMhz: 15_000 }],
    note: 'Ku-band intra-flight.',
  },
  'data:satcom': {
    key: 'data:satcom', label: 'SATCOM data', tier: 'data',
    spans: [{ loMhz: 7_250, hiMhz: 8_400 }, { loMhz: 12_000, hiMhz: 18_000 }],
    note: 'Military X-band and commercial Ku.',
  },
  'voice:HF': {
    key: 'voice:HF', label: 'HF voice', tier: 'voice',
    spans: [{ loMhz: 3, hiMhz: 30 }],
    note: 'Skywave, beyond line of sight, low rate. Survives when UHF does not.',
  },
  'voice:VHF': {
    key: 'voice:VHF', label: 'VHF voice', tier: 'voice',
    spans: [{ loMhz: 30, hiMhz: 174 }],
    note: 'Ground and air VHF, including combat-net radio.',
  },
  'voice:UHF': {
    key: 'voice:UHF', label: 'UHF voice', tier: 'voice',
    spans: [{ loMhz: 225, hiMhz: 400 }],
    note: 'Military air band. Shares spectrum with the Link 22 and Link 11 UHF legs.',
  },
  'voice:SATCOM': {
    key: 'voice:SATCOM', label: 'SATCOM voice', tier: 'voice',
    spans: [{ loMhz: 240, hiMhz: 320 }, { loMhz: 7_250, hiMhz: 8_400 }],
    note: 'Narrowband UHF SATCOM and wideband X-band.',
  },
  /** Indigenous links are nation-scoped; the key carries the nation suffix. */
  national: {
    key: 'national', label: 'National datalink', tier: 'track',
    spans: [{ loMhz: 225, hiMhz: 400 }],
    note: 'Indigenous waveform, UHF assumed from platform fit. Band descriptive only.',
  },
}

export function spectrumForNet(netKey: string): BearerSpectrum | null {
  if (BEARER_SPECTRUM[netKey]) return BEARER_SPECTRUM[netKey]
  if (netKey.startsWith('national:')) {
    const nation = netKey.slice('national:'.length)
    const base = BEARER_SPECTRUM.national
    return { ...base, key: netKey, label: `${base.label} (${nation})` }
  }
  return null
}

export interface BandContention {
  loMhz: number
  hiMhz: number
  /** Net keys sharing this stretch of spectrum. */
  netKeys: string[]
  label: string
}

/**
 * Find stretches of spectrum carrying more than one net.
 *
 * Contention cuts both ways: shared spectrum is where friendly links interfere
 * with each other, and where a single jammer reaches several of them at once.
 */
export function findContention(netKeys: string[]): BandContention[] {
  const edges = new Set<number>()
  const spans: { key: string; lo: number; hi: number }[] = []
  for (const k of netKeys) {
    const s = spectrumForNet(k)
    if (!s) continue
    for (const sp of s.spans) {
      spans.push({ key: k, lo: sp.loMhz, hi: sp.hiMhz })
      edges.add(sp.loMhz)
      edges.add(sp.hiMhz)
    }
  }
  const bounds = [...edges].sort((a, b) => a - b)
  const out: BandContention[] = []
  for (let i = 0; i < bounds.length - 1; i++) {
    const lo = bounds[i]
    const hi = bounds[i + 1]
    if (hi <= lo) continue
    const mid = (lo + hi) / 2
    const keys = [...new Set(spans.filter((s) => s.lo <= mid && mid <= s.hi).map((s) => s.key))].sort()
    if (keys.length > 1) {
      const last = out[out.length - 1]
      // Merge adjacent stretches carrying the same set of nets.
      if (last && last.hiMhz === lo && last.netKeys.join() === keys.join()) {
        last.hiMhz = hi
      } else {
        out.push({ loMhz: lo, hiMhz: hi, netKeys: keys, label: `${keys.length} nets` })
      }
    }
  }
  return out
}

/** Human-readable MHz/GHz for axis labels. */
export function formatMhz(mhz: number): string {
  if (mhz >= 1000) return `${(mhz / 1000).toFixed(mhz % 1000 === 0 ? 0 : 1)} GHz`
  return `${mhz} MHz`
}
