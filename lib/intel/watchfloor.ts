/**
 * Watchfloor: SPECTRAL's reporting feed. One name for everything that comes in
 * from outside: OSINT signals, news channels, official releases, analysis
 * and advisories. Change the display name here and nowhere else.
 */
export const WATCHFLOOR_NAME = 'Watchfloor'

export type WatchfloorStreamId =
  | 'incidents'
  | 'signals'
  | 'news'
  | 'official'
  | 'analysis'
  | 'advisories'

export interface WatchfloorStream {
  id: WatchfloorStreamId
  label: string
  /** What the stream contributes, in one line. */
  role: string
}

/**
 * The reporting avenues Watchfloor draws on. Each source below is collected
 * on a connected machine, graded, signed into a bundle and imported by the
 * deployed instance; nothing on the deployed box reaches out.
 */
export const WATCHFLOOR_STREAMS: readonly WatchfloorStream[] = [
  { id: 'incidents', label: 'Incident reporting', role: 'Strikes, intercepts and interference, graded by how many independent outlets report them' },
  { id: 'signals', label: 'Sensor signals', role: 'Thermal detections, GNSS interference maps and military air traffic that corroborate or contradict the reporting' },
  { id: 'news', label: 'News channels', role: 'Wire and broadcast newsrooms and specialist defence press' },
  { id: 'official', label: 'Official releases', role: 'Defence, ministerial and allied government releases' },
  { id: 'analysis', label: 'Analysis', role: 'Think tanks and daily conflict assessments' },
  { id: 'advisories', label: 'Advisories', role: 'Maritime security and navigation warnings' },
]
