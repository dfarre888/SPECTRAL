import { describe, expect, it } from 'vitest'
import { DEMO_SCENARIO_IDS, demoWoprScenarios, demoWoprTicks } from '@/lib/wopr/demo-scenarios'
import { csvField, EVENT_CSV_COLUMNS, eventsToCsv } from '@/lib/wopr/export/csv'
import { eventRows, recordFromLegacyEvent } from '@/lib/wopr/export/events'
import {
  buildScenarioExport,
  exportFileName,
  scenarioToJson,
  SCENARIO_EXPORT_FORMAT,
} from '@/lib/wopr/export/json'
import type { TickResult } from '@/lib/wopr/types'

/** RFC 4180 reader for the test: handles quotes, doubled quotes and embedded newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\r' && text[i + 1] === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
    } else field += c
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const scenario = demoWoprScenarios('t').find((s) => s.id === DEMO_SCENARIO_IDS.ts27)!
const ticks = demoWoprTicks(scenario.id)

describe('eventsToCsv', () => {
  const csv = eventsToCsv(ticks.map((t) => t.tick), scenario.classification)
  const rows = parseCsv(csv)

  it('starts with the protective marking, then the header', () => {
    expect(rows[0][0]).toBe(`# ${scenario.classification}`)
    expect(rows[1]).toEqual([...EVENT_CSV_COLUMNS])
  })

  it('has one row per event with six columns, in turn order', () => {
    const body = rows.slice(2)
    const expected = ticks.reduce((n, t) => n + (t.tick.records?.length ?? t.tick.events.length), 0)
    expect(body).toHaveLength(expected)
    for (const r of body) expect(r).toHaveLength(6)
    const turns = body.map((r) => Number(r[0]))
    expect(turns).toEqual([...turns].sort((a, b) => a - b))
    expect(body.some((r) => r[4] === 'detect' && r[2] === 'blue')).toBe(true)
    expect(body.every((r) => ['red', 'blue', 'referee'].includes(r[2]))).toBe(true)
    expect(Number(body[body.length - 1][1])).toBe(scenario.elapsed_min)
  })

  it('quotes commas, quotes and newlines, and defuses spreadsheet formulas', () => {
    expect(csvField('a,b')).toBe('"a,b"')
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    expect(csvField('line1\nline2')).toBe('"line1\nline2"')
    expect(csvField('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvField('@cmd')).toBe("'@cmd")
    expect(csvField(15)).toBe('15')
    const tick: TickResult = {
      turn: 1,
      elapsed_min: 15,
      red_picture: [],
      blue_picture: [],
      events: [],
      records: [{ type: 'note', side: 'referee', entity: 'Team, "A"', detail: 'two\nlines' }],
      propagation_refreshed: false,
    }
    const parsed = parseCsv(eventsToCsv([tick]))
    expect(parsed[1]).toEqual(['1', '15', 'referee', 'Team, "A"', 'note', 'two\nlines'])
  })

  it('classifies legacy string-only events', () => {
    expect(recordFromLegacyEvent('Turn 3: 15 min elapsed').type).toBe('turn')
    expect(recordFromLegacyEvent('red-x:blue-y J/S 12.0 dB · LOS')).toMatchObject({ type: 'propagation', entity: 'red-x:blue-y' })
    expect(recordFromLegacyEvent('Night transition — EO/IR').type).toBe('phase')
    const rows = eventRows([{ turn: 2, elapsed_min: 30, red_picture: [], blue_picture: [], events: ['hello'], propagation_refreshed: false }])
    expect(rows).toEqual([{ tick: 2, time_min: 30, side: 'referee', entity: '', event_type: 'note', detail: 'hello' }])
  })
})

describe('scenario JSON export', () => {
  it('round-trips the scenario, every tick and the flattened events', () => {
    const at = new Date('2026-09-24T03:00:00Z')
    const parsed = JSON.parse(scenarioToJson(scenario, [...ticks].reverse(), at))
    expect(parsed.format).toBe(SCENARIO_EXPORT_FORMAT)
    expect(parsed.exported_at).toBe('2026-09-24T03:00:00.000Z')
    expect(parsed.classification).toBe(scenario.classification)
    expect(parsed.scenario).toEqual(scenario)
    expect(parsed.ticks.map((t: { turn: number }) => t.turn)).toEqual(ticks.map((t) => t.turn))
    expect(parsed.ticks[0].world_state).toEqual(ticks[0].world_state)
    expect(parsed.events).toEqual(buildScenarioExport(scenario, ticks, at).events)
  })

  it('names files by scenario, time and format', () => {
    expect(exportFileName(scenario, 'json')).toBe('spectral-wopr-talisman-sabre-27-combat-team-drone-strike-vs-counter-ras-t60.json')
    expect(exportFileName({ name: '!!!', elapsed_min: 0 }, 'msdl')).toBe('spectral-wopr-scenario-t0-msdl.xml')
    expect(exportFileName({ name: 'A', elapsed_min: 15 }, 'csv')).toBe('spectral-wopr-a-t15-events.csv')
  })
})
