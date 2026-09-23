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
    return <span className="tag blue ml-2">Accredited</span>;
  }
  return <span className="tag ml-2">OSINT estimate</span>;
}

function Row({ label, value, badge }: { label: string; value: string | number; badge?: React.ReactNode }) {
  return (
    <div className="flex min-h-[34px] items-center justify-between gap-3 border-b border-[var(--store-line)] px-1 py-1.5 text-[13px] last:border-b-0">
      <span className="store-text-muted">{label}</span>
      <span className="flex items-center font-mono tabular-nums text-[var(--store-ink)]">{value}{badge}</span>
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
    <div className={cn('space-y-4 border-t border-[var(--store-line)] pt-4', className)}>
      <p className="text-[13px] font-semibold text-[var(--store-ink)]">
        PCM provenance
      </p>

      {pd && (
        <div>
          <p className="mb-1 text-[12px] font-medium text-[#06B6D4]">Detection Pd components</p>
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
        <div>
          <p className="mb-1 text-[12px] font-medium text-[#06B6D4]">Pair adjudication</p>
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
            <p className="px-1 pt-1.5 text-[12px] text-[#FF8A98]">{pair.immuneReason}</p>
          )}
          {showAccreditedLegend && (
            <p className="mt-2 px-1 text-[11.5px] store-text-muted">
              Pk figures marked Accredited are contract-analogue supplements, not MoD-verified.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
