'use client'

/** The five numbers a commander reads first. One of them glows. */
import type { ForceInstruments } from '@/lib/force-catalog/force-instruments'

export function InstrumentRow({ inst }: { inst: ForceInstruments }) {
  return (
    <div className="fc-inst border-b fc-hair" aria-label="Force instruments">
      <div>
        <div className="k">Blue in scope</div>
        <div className="v blue">{inst.blue.count}</div>
        <div className="d">{inst.blue.nations} nations · {inst.blue.sensorGaps} without sensor data</div>
      </div>
      <div>
        <div className="k">Red in scope</div>
        <div className="v red">{inst.red.count}</div>
        <div className="d">{inst.red.nations} nations · {inst.red.nationalOnly} on national links only</div>
      </div>
      <div>
        <div className="k">Track reach · Blue</div>
        <div className="v glow">{inst.track.reachPct}<small>%</small></div>
        <div className="d">largest picture / whole force · {inst.track.islands} island{inst.track.islands === 1 ? '' : 's'}</div>
      </div>
      <div>
        <div className="k">Under GNSS denial</div>
        <div className="v">{inst.denied.reachPct}<small>%</small></div>
        <div className="d">−{inst.denied.dropPts} pts · {inst.denied.dropToVoice} units drop to voice</div>
      </div>
      <div>
        <div className="k">Single point of failure</div>
        <div className="v" style={{ fontSize: 'clamp(18px, 1.6vw, 24px)', marginTop: 14 }}>{inst.spof ? inst.spof.short_name : '—'}</div>
        <div className="d">{inst.spof ? `−${inst.spof.reachDropPct} pts reach · ${inst.spof.strandedCount} units stranded` : 'no single gateway carries the picture'}</div>
      </div>
    </div>
  )
}
