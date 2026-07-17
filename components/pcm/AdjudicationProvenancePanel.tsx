'use client'

import React from 'react';
import type { PcmPairResult } from '@/lib/pcm/pcm-pair-adjudication';
import type { PdComponents } from '@/lib/pcm/fogOfWarEngine';
import { cn } from '@/lib/utils';

interface AdjudicationProvenancePanelProps {
  pd: PdComponents | null;
  pair: PcmPairResult | null;
  className?: string;
}

function PkSourceBadge({ source }: { source?: 'accredited' | 'osint' }) {
  if (source === 'accredited') {
    return (
      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/40">
        ACCREDITED
      </span>
    );
  }
  return (
    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider bg-[var(--store-surface-2)] store-text-muted border border-[var(--store-line)]">
      OSINT EST
    </span>
  );
}

function Row({ label, value, badge }: { label: string; value: string | number; badge?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5 px-2 rounded-lg store-panel-inner text-sm">
      <span className="store-text-muted">{label}</span>
      <span className="font-mono text-white flex items-center">{value}{badge}</span>
    </div>
  );
}

export function AdjudicationProvenancePanel({
  pd,
  pair,
  className,
}: AdjudicationProvenancePanelProps) {
  if (!pd && !pair) return null;

  const showAccreditedLegend = pair?.data_source === 'accredited';

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
          <Row
            label="Combined Pk"
            value={pair.combinedBlueSuccessPct + '%'}
            badge={<PkSourceBadge source={pair.data_source} />}
          />
          <Row label="Spectrum verdict" value={pair.spectrumVerdict} />
          <Row label="In range" value={pair.inRange ? 'yes' : 'no'} />
          <Row label="Propagation gated" value={pair.propagationGated ? 'yes' : 'no'} />
          {pair.defeatMatrixPk != null && (
            <Row
              label="Defeat matrix Pk"
              value={pair.defeatMatrixPk + '%'}
              badge={<PkSourceBadge source={pair.data_source} />}
            />
          )}
          {pair.isImmune && pair.immuneReason && (
            <p className="text-xs font-mono text-red px-2">{pair.immuneReason}</p>
          )}
          {showAccreditedLegend && (
            <p className="text-[11px] store-text-muted italic font-mono mt-2 px-2">
              Pk figures marked ACCREDITED are contract-analogue supplements, not MoD-verified.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
