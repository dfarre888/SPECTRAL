'use client'

import type { PcmPairResult } from '@/lib/pcm/pcm-pair-adjudication';
import type { PdComponents } from '@/lib/pcm/fogOfWarEngine';
import { cn } from '@/lib/utils';

interface AdjudicationProvenancePanelProps {
  pd: PdComponents | null;
  pair: PcmPairResult | null;
  className?: string;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-1.5 px-2 rounded-lg store-panel-inner text-sm">
      <span className="store-text-muted">{label}</span>
      <span className="font-mono text-white">{value}</span>
    </div>
  );
}

export function AdjudicationProvenancePanel({
  pd,
  pair,
  className,
}: AdjudicationProvenancePanelProps) {
  if (!pd && !pair) return null;

  return (
    <div className={cn('space-y-4 border-t border-white/10 pt-4', className)}>
      <p className="text-xs store-text-muted uppercase tracking-wider font-semibold">
        PCM provenance
      </p>

      {pd && (
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-cyan uppercase">Detection Pd components</p>
          <Row label="Sensor" value={pd.sensor_type} />
          <Row label="Base Pd" value={pd.base_pd.toFixed(3)} />
          <Row label="Weather mod" value={pd.weather_modifier.toFixed(2)} />
          <Row label="EW mod" value={pd.ew_modifier.toFixed(2)} />
          <Row label="Altitude mod" value={pd.altitude_modifier.toFixed(2)} />
          <Row label="RCS mod" value={pd.rcs_modifier.toFixed(2)} />
          <Row label="Terrain mod" value={pd.terrain_masking_modifier.toFixed(2)} />
          <Row label="Countermod" value={pd.countermeasures_modifier.toFixed(2)} />
          <Row label="Final Pd" value={pd.final_pd.toFixed(3)} />
        </div>
      )}

      {pair && (
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-cyan uppercase">Pair adjudication</p>
          <Row label="Combined Pk" value={pair.combinedBlueSuccessPct + '%'} />
          <Row label="Spectrum verdict" value={pair.spectrumVerdict} />
          <Row label="In range" value={pair.inRange ? 'yes' : 'no'} />
          <Row label="Propagation gated" value={pair.propagationGated ? 'yes' : 'no'} />
          {pair.defeatMatrixPk != null && (
            <Row label="Defeat matrix Pk" value={pair.defeatMatrixPk + '%'} />
          )}
          {pair.isImmune && pair.immuneReason && (
            <p className="text-xs font-mono text-red px-2">{pair.immuneReason}</p>
          )}
        </div>
      )}
    </div>
  );
}
