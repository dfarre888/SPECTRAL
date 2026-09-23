'use client';

import { IADS_STACK_PRESETS, offsetLatLon, type IadsStackPreset } from '@/lib/planner/iads-stacks';
import type { MapAssetsPayload, PlacedCuas, PlacedEffector, PlacedRadar } from '@/lib/map/types';

interface Props {
  assets: MapAssetsPayload;
  onApply: (result: { radars: PlacedRadar[]; effectors: PlacedEffector[]; cuas: PlacedCuas[] }) => void;
}

function findAsset(assets: MapAssetsPayload, platformId: string) {
  return (
    assets.radars.find((r) => r.id === platformId || r.id.includes(platformId)) ??
    assets.effectors.find((e) => e.id === platformId || e.id.includes(platformId)) ??
    assets.cuas.find((c) => c.id === platformId)
  );
}

export function IadsStackPanel({ assets, onApply }: Props) {
  const apply = (preset: IadsStackPreset) => {
    const radars: PlacedRadar[] = [];
    const effectors: PlacedEffector[] = [];
    const cuas: PlacedCuas[] = [];
    for (const layer of preset.layers) {
      const pos = offsetLatLon(preset.anchor, layer.offsetKm?.dx ?? 0, layer.offsetKm?.dy ?? 0);
      const asset = findAsset(assets, layer.platformId);
      if (!asset) continue;
      const instanceId = `iads-${preset.id}-${layer.platformId}-${crypto.randomUUID().slice(0, 8)}`;
      if ('role' in asset && 'dome_range_km' in asset) {
        radars.push({ instanceId, asset: asset as PlacedRadar['asset'], lon: pos.lon, lat: pos.lat, terrainAMSL: 50 });
      } else if ('tier' in asset) {
        effectors.push({ instanceId, asset: asset as PlacedEffector['asset'], lon: pos.lon, lat: pos.lat, terrainAMSL: 30 });
      } else {
        cuas.push({ instanceId, asset: asset as PlacedCuas['asset'], lon: pos.lon, lat: pos.lat, terrainAMSL: 30, hasTerrainMasking: false });
      }
    }
    onApply({ radars, effectors, cuas });
  };

  return (
    <div className="space-y-2">
      <p className="text-[12px] store-text-muted leading-relaxed">
        Pick a preset to place its radars and effectors around the preset anchor.
      </p>
      {IADS_STACK_PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => apply(p)}
          className="map-press block w-full text-left rounded-xl store-panel-inner px-3 py-2.5 transition-colors hover:border-[rgba(41,151,255,0.5)] hover:bg-[rgba(41,151,255,0.06)]"
        >
          <span className="block text-[13px] font-medium text-[var(--store-ink)] leading-snug">{p.name}</span>
          <span className="block text-[12px] store-text-muted mt-1 leading-relaxed">{p.description}</span>
          <span className="block font-mono text-[11px] store-text-muted mt-1.5">
            {p.layers.length} layer{p.layers.length === 1 ? '' : 's'}
          </span>
        </button>
      ))}
    </div>
  );
}
