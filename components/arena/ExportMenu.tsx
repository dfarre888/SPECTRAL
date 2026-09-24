'use client'

import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { eventsToCsv } from '@/lib/wopr/export/csv'
import { exportFileName, scenarioToJson, type ExportFormat } from '@/lib/wopr/export/json'
import { scenarioToMsdl } from '@/lib/wopr/export/msdl'
import type { TickFrame } from '@/lib/wopr/tick-history'
import type { TickRecord, WoprScenario } from '@/lib/wopr/types'

const ITEMS: { format: ExportFormat; label: string; detail: string }[] = [
  { format: 'json', label: 'Scenario and history', detail: 'JSON: laydown, every recorded turn, event log' },
  { format: 'csv', label: 'Event log', detail: 'CSV: tick, time, side, entity, event type, detail' },
  { format: 'msdl', label: 'Initial laydown for federation', detail: 'MSDL XML (SISO-STD-007): force sides, units, equipment, positions' },
]

const MIME: Record<ExportFormat, string> = {
  json: 'application/json',
  csv: 'text/csv',
  msdl: 'application/xml',
}

function framesToRecords(frames: readonly TickFrame[]): TickRecord[] {
  return frames.map((f) => ({
    turn: f.tick.turn,
    elapsed_min: f.tick.elapsed_min,
    tick: f.tick,
    world_state: f.world ?? null,
    created_at: f.receivedAt,
  }))
}

function saveText(filename: string, mime: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Export the scenario for analysis (JSON, CSV) or federation (MSDL).
 * API-backed scenarios download from the export route, which reads the stored
 * history and writes an audit record. Training vignettes are built here.
 */
export function ExportMenu({
  scenario,
  frames,
  apiBacked,
}: {
  scenario: WoprScenario | null
  frames: readonly TickFrame[]
  apiBacked: boolean
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function exportLocal(format: ExportFormat) {
    if (!scenario) return
    const records = framesToRecords(frames)
    const text =
      format === 'json'
        ? scenarioToJson(scenario, records)
        : format === 'csv'
          ? eventsToCsv(records.map((r) => r.tick), scenario.classification)
          : scenarioToMsdl(scenario, { pocOrg: 'SPECTRAL' })
    saveText(exportFileName(scenario, format), MIME[format], text)
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!scenario}
        aria-expanded={open}
        aria-haspopup="menu"
        title={scenario ? 'Export for analysis or federation' : 'Select a scenario first'}
        className="lg-btn"
        data-testid="arena-export"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        Export
      </button>
      {open && scenario ? (
        <div role="menu" aria-label="Export scenario" className="glass-popover absolute right-0 top-full z-30 mt-2 w-[320px] !bg-[var(--store-surface)] p-1.5">
          {ITEMS.map((item) =>
            apiBacked ? (
              <a
                key={item.format}
                role="menuitem"
                href={`/api/v1/wopr/scenarios/${encodeURIComponent(scenario.id)}/export?format=${item.format}`}
                download={exportFileName(scenario, item.format)}
                onClick={() => setOpen(false)}
                className="block rounded-[10px] px-3 py-2 transition-colors duration-150 hover:bg-white/[0.07]"
                data-testid={`export-${item.format}`}
              >
                <span className="block text-[13px] font-medium text-[var(--store-ink)]">{item.label}</span>
                <span className="mt-0.5 block text-[12px] store-text-muted">{item.detail}</span>
              </a>
            ) : (
              <button
                key={item.format}
                type="button"
                role="menuitem"
                onClick={() => {
                  exportLocal(item.format)
                  setOpen(false)
                }}
                className="block w-full rounded-[10px] px-3 py-2 text-left transition-colors duration-150 hover:bg-white/[0.07]"
                data-testid={`export-${item.format}`}
              >
                <span className="block text-[13px] font-medium text-[var(--store-ink)]">{item.label}</span>
                <span className="mt-0.5 block text-[12px] store-text-muted">{item.detail}</span>
              </button>
            ),
          )}
          <p className="mx-3 mb-1.5 mt-1 border-t border-[var(--store-line)] pt-2 text-[12px] leading-relaxed store-text-muted">
            MSDL initialises HLA and DIS federations. A live HLA or DIS connection is not built in.
          </p>
        </div>
      ) : null}
    </div>
  )
}
