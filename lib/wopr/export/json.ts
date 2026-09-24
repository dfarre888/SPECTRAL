import { eventRows, type EventRow } from '@/lib/wopr/export/events'
import type { TickRecord, WoprScenario } from '@/lib/wopr/types'

export const SCENARIO_EXPORT_FORMAT = 'spectral.wopr.scenario'
export const SCENARIO_EXPORT_VERSION = 1

export interface ScenarioExport {
  format: typeof SCENARIO_EXPORT_FORMAT
  version: typeof SCENARIO_EXPORT_VERSION
  classification: string
  exported_at: string
  scenario: WoprScenario
  /** Every recorded turn, oldest first, with the world as it stood after it when known. */
  ticks: TickRecord[]
  /** The event log flattened for analysis (same rows as the CSV). */
  events: EventRow[]
  notes: string[]
}

export function buildScenarioExport(
  scenario: WoprScenario,
  ticks: readonly TickRecord[],
  exportedAt: Date = new Date(),
): ScenarioExport {
  const ordered = [...ticks].sort((a, b) => a.turn - b.turn)
  return {
    format: SCENARIO_EXPORT_FORMAT,
    version: SCENARIO_EXPORT_VERSION,
    classification: scenario.classification,
    exported_at: exportedAt.toISOString(),
    scenario,
    ticks: ordered,
    events: eventRows(ordered.map((t) => t.tick)),
    notes: [
      'OSINT training data. Ranges, speeds and timings in the laydown are planning assumptions unless a source is given.',
      'Sensor pictures include position jitter; a held track is not ground truth.',
    ],
  }
}

export function scenarioToJson(
  scenario: WoprScenario,
  ticks: readonly TickRecord[],
  exportedAt: Date = new Date(),
): string {
  return JSON.stringify(buildScenarioExport(scenario, ticks, exportedAt), null, 2) + '\n'
}

/** File-system safe slug for export file names. */
export function exportSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || 'scenario'
}

export type ExportFormat = 'json' | 'csv' | 'msdl'

export function exportFileName(scenario: Pick<WoprScenario, 'name' | 'elapsed_min'>, format: ExportFormat): string {
  const base = `spectral-wopr-${exportSlug(scenario.name)}-t${Math.round(scenario.elapsed_min)}`
  if (format === 'json') return `${base}.json`
  if (format === 'csv') return `${base}-events.csv`
  return `${base}-msdl.xml`
}
