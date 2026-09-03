'use client'

import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { buildScenarioBrief, type BriefSideDetection } from '@/lib/wopr/scenario-brief'
import type { TickResult, WoprScenario } from '@/lib/wopr/types'

interface ScenarioBriefSheetProps {
  scenario: WoprScenario | null
  tick: TickResult | null
  open: boolean
  onClose: () => void
}

function pctTone(pct: number): string {
  if (pct >= 80) return 'var(--store-success)'
  if (pct >= 40) return 'var(--store-accent)'
  return '#f87171'
}

function DetectionBlock({ side }: { side: BriefSideDetection }) {
  const label = side.observer === 'blue' ? 'Blue holds Red' : 'Red holds Blue'
  return (
    <div className="brief-block">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="brief-h3">{label}</h3>
        <span className="brief-mono" style={{ color: pctTone(side.coveragePct) }}>
          {side.detectedCount} / {side.totalCount} · {side.coveragePct}%
        </span>
      </div>
      {side.rows.length === 0 ? (
        <p className="brief-muted">No live opposing platforms.</p>
      ) : (
        <table className="brief-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Held</th>
              <th>Confidence</th>
              <th>Sensor</th>
            </tr>
          </thead>
          <tbody>
            {side.rows.map((r) => (
              <tr key={r.targetId}>
                <td>{r.targetName}</td>
                <td style={{ color: r.detected ? 'var(--store-success)' : '#f87171' }}>
                  {r.detected ? 'yes' : 'NO'}
                </td>
                <td>{r.confidence ?? '—'}</td>
                <td>{r.source ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function ScenarioBriefSheet({ scenario, tick, open, onClose }: ScenarioBriefSheetProps) {
  const brief = useMemo(
    () => (scenario ? buildScenarioBrief(scenario, tick) : null),
    [scenario, tick],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !brief || typeof document === 'undefined') return null

  const gap = Math.abs(
    brief.detection.blueSeesRed.coveragePct - brief.detection.redSeesBlue.coveragePct,
  )

  return createPortal(
    <div className="fixed inset-0 z-[9998] overflow-auto bg-black/70 brief-root">
      <div className="min-h-full flex items-start justify-center p-6 brief-shell">
        <div className="brief-paper">
          {/* Screen-only controls — hidden by the print stylesheet below. */}
          <div className="brief-controls">
            <button type="button" onClick={onClose} className="brief-btn">Close</button>
            <button type="button" onClick={() => window.print()} className="brief-btn brief-btn-primary">
              Print / Save as PDF
            </button>
          </div>

          <header className="brief-head">
            <p className="brief-class">{brief.classification} // FOR OFFICIAL TRAINING USE ONLY</p>
            <h1 className="brief-h1">{brief.title}</h1>
            <p className="brief-mono brief-muted">
              Scenario brief · T+{brief.elapsedMin} min · status {brief.status} · generated{' '}
              {new Date(brief.generatedAt).toUTCString()}
            </p>
          </header>

          <div className="brief-block">
            <h3 className="brief-h3">Battlespace</h3>
            <table className="brief-table">
              <tbody>
                <tr><td>Terrain</td><td>{brief.battlespace.terrain}</td></tr>
                <tr><td>Light</td><td>{brief.battlespace.dayNight}</td></tr>
                <tr><td>Wind</td><td>{brief.battlespace.windKts} kts</td></tr>
                <tr><td>Visibility</td><td>{brief.battlespace.visibilityKm} km</td></tr>
                <tr><td>Cloud base</td><td>{brief.battlespace.cloudBaseFt} ft</td></tr>
              </tbody>
            </table>
          </div>

          <div className="brief-block">
            <h3 className="brief-h3">Order of battle — ground truth</h3>
            <table className="brief-table">
              <thead>
                <tr><th>Side</th><th>Platform</th><th>Type</th><th>Position</th><th>Alt</th><th>State</th></tr>
              </thead>
              <tbody>
                {[...brief.orbat.red, ...brief.orbat.blue].map((p) => (
                  <tr key={p.id}>
                    <td style={{ color: p.side === 'red' ? '#f87171' : '#60a5fa' }}>{p.side}</td>
                    <td>{p.name}</td>
                    <td>{p.platformType}</td>
                    <td>{p.lat.toFixed(3)}, {p.lon.toFixed(3)}</td>
                    <td>{p.altM} m</td>
                    <td>
                      {p.destroyed ? 'destroyed' : p.radiating ? 'radiating' : 'silent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="brief-block brief-callout">
            <h3 className="brief-h3">Intelligence gap</h3>
            <p>
              Blue holds <strong>{brief.detection.blueSeesRed.coveragePct}%</strong> of live Red
              platforms; Red holds <strong>{brief.detection.redSeesBlue.coveragePct}%</strong> of
              live Blue. The asymmetry between those figures — <strong>{gap} points</strong> — is
              the decision advantage held by one side at this moment.
            </p>
          </div>

          <DetectionBlock side={brief.detection.blueSeesRed} />
          <DetectionBlock side={brief.detection.redSeesBlue} />

          {brief.comms.length > 0 && (
            <div className="brief-block">
              <h3 className="brief-h3">Communications</h3>
              <table className="brief-table">
                <tbody>
                  {brief.comms.map((c) => (
                    <tr key={c.id}><td>{c.id}</td><td>{c.state}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {brief.events.length > 0 && (
            <div className="brief-block">
              <h3 className="brief-h3">Event log</h3>
              <ul className="brief-list">
                {brief.events.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <footer className="brief-foot">
            <p className="brief-class">{brief.classification} // FOR OFFICIAL TRAINING USE ONLY</p>
            <p className="brief-muted brief-mono">
              OSINT sources only. Generated by Spectral — figures are training estimates, not
              operational planning data.
            </p>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        .brief-paper {
          width: 100%; max-width: 820px; background: #fff; color: #111;
          padding: 32px 36px; border-radius: 10px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        }
        .brief-controls { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 18px; }
        .brief-btn {
          font: 500 12px ui-monospace, SFMono-Regular, Menlo, monospace;
          padding: 6px 12px; border-radius: 8px; border: 1px solid #d4d4d8; background: #fafafa; color: #111;
        }
        .brief-btn-primary { background: #F97316; border-color: #F97316; color: #fff; }
        .brief-head { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
        .brief-class {
          font: 700 10px ui-monospace, SFMono-Regular, Menlo, monospace;
          letter-spacing: .12em; text-transform: uppercase; color: #b45309; margin: 0 0 6px;
        }
        .brief-h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
        .brief-h3 {
          font: 700 11px ui-monospace, SFMono-Regular, Menlo, monospace;
          letter-spacing: .1em; text-transform: uppercase; color: #3f3f46; margin: 0 0 8px;
        }
        .brief-mono { font: 400 11px ui-monospace, SFMono-Regular, Menlo, monospace; }
        .brief-muted { color: #52525b; font-size: 11px; margin: 0; }
        .brief-block { margin-bottom: 20px; break-inside: avoid; }
        .brief-callout { background: #fff7ed; border-left: 3px solid #F97316; padding: 12px 14px; border-radius: 4px; font-size: 13px; }
        .brief-callout p { margin: 0; }
        .brief-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .brief-table th {
          text-align: left; font: 700 10px ui-monospace, monospace; text-transform: uppercase;
          letter-spacing: .06em; color: #52525b; border-bottom: 1px solid #d4d4d8; padding: 4px 6px;
        }
        .brief-table td { padding: 4px 6px; border-bottom: 1px solid #f4f4f5; }
        .brief-list { margin: 0; padding-left: 18px; font-size: 12px; }
        .brief-list li { margin-bottom: 3px; }
        .brief-foot { border-top: 1px solid #d4d4d8; padding-top: 10px; margin-top: 24px; }

        @media print {
          /* Print only the brief: hide the app shell entirely. */
          body > *:not(.brief-root) { display: none !important; }
          .brief-root { position: static !important; background: #fff !important; overflow: visible !important; }
          .brief-shell { padding: 0 !important; display: block !important; }
          .brief-paper { max-width: none; border-radius: 0; padding: 0; }
          .brief-controls { display: none !important; }
          @page { margin: 16mm; }
        }
      `}</style>
    </div>,
    document.body,
  )
}
