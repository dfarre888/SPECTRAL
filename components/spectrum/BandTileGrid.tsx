'use client';
/**
 * BandTileGrid — Band Tiles view mode for SpectrumWorkspace and Map Intel laydown.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  BAND_TILES,
  BAND_TILE_SECTIONS,
  type AllocationBox,
  type BandTile,
} from './band-tile-data';
import {
  emissionsForTile,
  emissionClipInTile,
  kindChipLabel,
  emissionBarStyle,
  activeTileIds,
  computeStackedTileMetrics,
  applyStackedLayout,
  stackedBrickStyle,
  LAYDOWN_TILE_VB_W,
  type LaydownEmission,
  type StackedTileMetrics,
} from '@/lib/map/laydown-tiles';
import { formatNativeSpectrumValue } from '@/lib/spectrum/scale';
import { SpectrumPulseOverlay } from './SpectrumPulseOverlay';

const VB_W = 680;

export interface BandTileGridProps {
  emissions?: LaydownEmission[];
  tiles?: BandTile[];
  compact?: boolean;
  fullscreenExpand?: boolean;
  activeOnly?: boolean;
  showRecommendations?: boolean;
  onTileClick?: (tile: BandTile) => void;
  showSpectrumPulse?: boolean;
  spectrumPulseProminent?: boolean;
}

interface TooltipState {
  box: AllocationBox;
  left: number;
  top: number;
}

interface EmissionTooltipState {
  label: string;
  lo: number;
  hi: number;
  left: number;
  top: number;
}

function AllocationHitAreas({
  tile,
  onHover,
  onLeave,
}: {
  tile: BandTile;
  onHover: (box: AllocationBox, rect: DOMRect, tileRect: DOMRect) => void;
  onLeave: () => void;
}) {
  const imgRef = useRef<HTMLDivElement>(null);

  const pct = useCallback(
    (svgX: number, svgW: number, svgY: number, svgH_row: number) => ({
      left: `${(svgX / VB_W) * 100}%`,
      width: `${(svgW / VB_W) * 100}%`,
      top: `${(svgY / tile.viewBoxH) * 100}%`,
      height: `${(svgH_row / tile.viewBoxH) * 100}%`,
    }),
    [tile.viewBoxH],
  );

  return (
    <div ref={imgRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {tile.boxes.map((box, i) => {
        const y = box.row === 'top' ? tile.rowTopY : tile.rowBotY;
        const pos = pct(box.x, box.w, y, tile.rowH);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              ...pos,
              pointerEvents: 'auto',
              cursor: 'crosshair',
              zIndex: 2,
            }}
            onMouseEnter={(e) => {
              const boxRect = e.currentTarget.getBoundingClientRect();
              const tileRect = e.currentTarget.closest('[data-tile-card]')?.getBoundingClientRect();
              if (tileRect) onHover(box, boxRect, tileRect);
            }}
            onMouseLeave={onLeave}
          />
        );
      })}
    </div>
  );
}

function AssetEmissionOverlay({
  tile,
  emissions,
  onEmissionHover,
  onEmissionLeave,
}: {
  tile: BandTile;
  emissions: LaydownEmission[];
  onEmissionHover: (em: LaydownEmission, barRect: DOMRect, tileRect: DOMRect) => void;
  onEmissionLeave: () => void;
}) {
  const inTile = emissionsForTile(tile, emissions);
  if (inTile.length === 0) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
      {inTile.map((em) => {
        const style = emissionBarStyle(em, tile, 'top');
        const clip = emissionClipInTile(em, tile);
        if (!style || !clip) return null;
        return (
          <div
            key={em.id}
            style={{
              ...style,
              pointerEvents: 'auto',
              cursor: 'default',
              zIndex: 10,
            }}
            onPointerEnter={(e) => {
              e.stopPropagation();
              const barRect = e.currentTarget.getBoundingClientRect();
              const tileRect = e.currentTarget.closest('[data-tile-card]')?.getBoundingClientRect();
              if (tileRect) onEmissionHover(em, barRect, tileRect);
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              onEmissionLeave();
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        );
      })}
    </div>
  );
}

function StackedAssetOverlay({
  tile,
  metrics,
  onEmissionHover,
  onEmissionLeave,
}: {
  tile: BandTile;
  metrics: StackedTileMetrics;
  onEmissionHover: (em: LaydownEmission, barRect: DOMRect, tileRect: DOMRect) => void;
  onEmissionLeave: () => void;
}) {
  if (metrics.bricks.length === 0) return null;
  const gutterPct = (metrics.gutterW / LAYDOWN_TILE_VB_W) * 100;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
      {metrics.bricks.map((brick) => {
        const style = stackedBrickStyle(brick, tile);
        if (!style) return null;
        const topPct = (brick.y / tile.viewBoxH) * 100;
        const heightPct = (brick.height / tile.viewBoxH) * 100;
        const label = brick.emission.label;
        const cap = brick.emission.capabilityLabel;

        return (
          <React.Fragment key={brick.emission.id}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                width: `${gutterPct}%`,
                top: `${topPct}%`,
                height: `${heightPct}%`,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 4,
                paddingRight: 2,
                overflow: 'hidden',
                zIndex: 5,
              }}
              title={label}
            >
              <span
                style={{
                  fontFamily: 'var(--sx-mono, monospace)',
                  fontSize: 8,
                  letterSpacing: '0.04em',
                  color: brick.side === 'red' ? 'rgba(248,113,113,0.9)' : 'rgba(74,158,255,0.9)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
            <div
              style={{
                ...style,
                pointerEvents: 'auto',
                cursor: 'default',
                zIndex: 10,
              }}
              onPointerEnter={(e) => {
                e.stopPropagation();
                const barRect = e.currentTarget.getBoundingClientRect();
                const tileRect = e.currentTarget.closest('[data-tile-card]')?.getBoundingClientRect();
                if (tileRect) onEmissionHover(brick.emission, barRect, tileRect);
              }}
              onPointerLeave={(e) => {
                e.stopPropagation();
                onEmissionLeave();
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {cap && (
                <span
                  style={{
                    position: 'absolute',
                    left: 4,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontFamily: 'var(--sx-mono, monospace)',
                    fontSize: 7,
                    letterSpacing: '0.06em',
                    color: 'rgba(255,255,255,0.85)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 'calc(100% - 8px)',
                    pointerEvents: 'none',
                  }}
                >
                  {cap}
                </span>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function EmissionTooltip({
  tile,
  state,
  expanded,
}: {
  tile: BandTile;
  state: EmissionTooltipState;
  expanded: boolean;
}) {
  const MAX_W = expanded ? 280 : 220;
  const lo = Math.min(state.lo, state.hi);
  const hi = Math.max(state.lo, state.hi);

  return (
    <div
      style={{
        position: 'absolute',
        left: Math.min(state.left, (expanded ? 900 : 380) - MAX_W - 8),
        top: state.top - 8,
        transform: 'translate(-50%, -100%)',
        width: MAX_W,
        background: 'rgba(6,8,10,0.97)',
        border: '1px solid rgba(6,182,212,0.4)',
        borderRadius: 10,
        padding: '10px 13px',
        zIndex: 50,
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--sx-mono, monospace)',
          fontSize: 11,
          fontWeight: 700,
          color: '#06B6D4',
          letterSpacing: '0.06em',
          marginBottom: 5,
        }}
      >
        {state.label}
      </div>
      <div
        style={{
          fontFamily: 'var(--sx-mono, monospace)',
          fontSize: 11,
          color: 'rgba(255,255,255,0.75)',
          lineHeight: 1.55,
        }}
      >
        {formatNativeSpectrumValue(tile.unit, lo)} – {formatNativeSpectrumValue(tile.unit, hi)}
      </div>
    </div>
  );
}

function Tooltip({ state, expanded }: { state: TooltipState; expanded: boolean }) {
  const MAX_W = expanded ? 320 : 220;
  return (
    <div
      style={{
        position: 'absolute',
        left: Math.min(state.left, (expanded ? 900 : 380) - MAX_W - 8),
        top: state.top - 8,
        transform: 'translateY(-100%)',
        width: MAX_W,
        background: 'rgba(6,8,10,0.97)',
        border: '1px solid rgba(249,115,22,0.35)',
        borderRadius: 10,
        padding: '10px 13px',
        zIndex: 50,
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--sx-mono, monospace)',
          fontSize: 11,
          fontWeight: 700,
          color: '#F97316',
          letterSpacing: '0.08em',
          marginBottom: 5,
        }}
      >
        {state.box.label}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
        {state.box.detail}
      </div>
    </div>
  );
}

export function TileCard({
  tile,
  expanded,
  onExpand,
  emissions = [],
  compact = false,
  fullscreenExpand = false,
  onTileClick,
  showSpectrumPulse = true,
  fillViewport = false,
  spectrumPulseProminent = false,
  stacked = false,
  showRed = true,
  showBlue = true,
}: {
  tile: BandTile;
  expanded: boolean;
  onExpand: () => void;
  emissions?: LaydownEmission[];
  compact?: boolean;
  fullscreenExpand?: boolean;
  onTileClick?: (tile: BandTile) => void;
  showSpectrumPulse?: boolean;
  fillViewport?: boolean;
  spectrumPulseProminent?: boolean;
  stacked?: boolean;
  showRed?: boolean;
  showBlue?: boolean;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [emissionTooltip, setEmissionTooltip] = useState<EmissionTooltipState | null>(null);
  const tileEmissions = emissionsForTile(tile, emissions);

  const stackedMetrics = useMemo(() => {
    if (!stacked) return null;
    return computeStackedTileMetrics(tile, emissions, { showRed, showBlue });
  }, [stacked, tile, emissions, showRed, showBlue]);

  const layoutTile = useMemo(() => {
    if (stacked && stackedMetrics) return applyStackedLayout(tile, stackedMetrics);
    return tile;
  }, [stacked, tile, stackedMetrics]);

  const overlayEmissions = useMemo(() => {
    if (stacked && stackedMetrics) {
      return stackedMetrics.bricks.map((b) => b.emission);
    }
    return emissions;
  }, [stacked, stackedMetrics, emissions]);

  const handleEmissionHover = useCallback(
    (em: LaydownEmission, barRect: DOMRect, tileRect: DOMRect) => {
      const clip = emissionClipInTile(em, layoutTile);
      if (!clip) return;
      setEmissionTooltip({
        label: em.capabilityLabel ?? em.label,
        lo: clip.lo,
        hi: clip.hi,
        left: barRect.left - tileRect.left + barRect.width / 2,
        top: barRect.top - tileRect.top,
      });
    },
    [layoutTile],
  );

  const handleHover = useCallback(
    (box: AllocationBox, boxRect: DOMRect, tileRect: DOMRect) => {
      setTooltip({
        box,
        left: boxRect.left - tileRect.left + boxRect.width / 2,
        top: boxRect.top - tileRect.top,
      });
    },
    [],
  );

  const handleCardClick = () => {
    if (fullscreenExpand && onTileClick) {
      onTileClick(tile);
      return;
    }
    if (!expanded && !tooltip) onExpand();
  };

  const aspectPad = `${(layoutTile.viewBoxH / VB_W) * 100}%`;
  const chipKinds = Array.from(new Set(tileEmissions.map((e) => e.kind)));

  return (
    <div
      data-tile-card=""
      style={{
        position: 'relative',
        borderRadius: compact ? 8 : 12,
        overflow: 'hidden',
        border: expanded
          ? '1px solid rgba(249,115,22,0.5)'
          : '1px solid rgba(255,255,255,0.06)',
        background: 'radial-gradient(ellipse at 30% 40%, #0D1B2E 0%, #0A0A0F 70%)',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        gridColumn: expanded && !fullscreenExpand ? '1 / -1' : undefined,
        display: fillViewport ? 'flex' : undefined,
        flexDirection: fillViewport ? 'column' : undefined,
        height: fillViewport ? '100%' : undefined,
        minHeight: fillViewport ? 0 : undefined,
      }}
      onClick={handleCardClick}
      onMouseLeave={() => {
        setTooltip(null);
        setEmissionTooltip(null);
      }}
    >
      <div
        style={
          fillViewport
            ? { position: 'relative', flex: 1, minHeight: 0 }
            : { position: 'relative', paddingBottom: aspectPad }
        }
      >
        <img
          src={tile.overlay}
          alt={`${tile.band} spectrum overlay`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            userSelect: 'none',
            pointerEvents: 'none',
            objectFit: fillViewport ? 'contain' : undefined,
          }}
          draggable={false}
        />
        <AllocationHitAreas tile={layoutTile} onHover={handleHover} onLeave={() => setTooltip(null)} />
        {emissions.length > 0 && stacked && stackedMetrics ? (
          <StackedAssetOverlay
            tile={layoutTile}
            metrics={stackedMetrics}
            onEmissionHover={handleEmissionHover}
            onEmissionLeave={() => setEmissionTooltip(null)}
          />
        ) : (
          emissions.length > 0 && (
            <AssetEmissionOverlay
              tile={layoutTile}
              emissions={emissions}
              onEmissionHover={handleEmissionHover}
              onEmissionLeave={() => setEmissionTooltip(null)}
            />
          )
        )}
        {overlayEmissions.length > 0 && showSpectrumPulse && (
          <SpectrumPulseOverlay
            tile={layoutTile}
            emissions={overlayEmissions}
            showPulse
            stacked={stacked}
            prominent={
              spectrumPulseProminent || expanded || fullscreenExpand || fillViewport
            }
          />
        )}
        {tooltip && <Tooltip state={tooltip} expanded={expanded} />}
        {emissionTooltip && (
          <EmissionTooltip tile={layoutTile} state={emissionTooltip} expanded={expanded} />
        )}
      </div>

      <div
        style={{
          padding: compact ? '6px 8px' : '9px 13px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: compact ? 'column' : 'row',
          alignItems: compact ? 'stretch' : 'baseline',
          gap: compact ? 4 : 10,
          background: 'rgba(0,0,0,0.35)',
          flexShrink: fillViewport ? 0 : undefined,
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (fullscreenExpand && onTileClick) onTileClick(tile);
          else onExpand();
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--sx-mono, monospace)',
              fontWeight: 700,
              fontSize: compact ? 10 : expanded ? 15 : 12,
              color: '#F97316',
              letterSpacing: '0.06em',
              flexShrink: 0,
            }}
          >
            {tile.band}
          </span>
          <span
            style={{
              fontFamily: 'var(--sx-mono, monospace)',
              fontSize: compact ? 9 : 10,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.04em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tile.range}
          </span>
          {!compact && (
            <span
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                marginLeft: 'auto',
                flexShrink: 0,
              }}
            >
              {expanded ? '▲ collapse' : tile.description}
            </span>
          )}
        </div>
        {tileEmissions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {chipKinds.map((kind) => {
              const count = tileEmissions.filter((e) => e.kind === kind).length;
              return (
                <span
                  key={kind}
                  style={{
                    fontFamily: 'var(--sx-mono, monospace)',
                    fontSize: 8,
                    letterSpacing: '0.08em',
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.12)',
                    color:
                      kind === 'recommended_detect' || kind === 'recommended_defeat'
                        ? '#FACC15'
                        : '#06B6D4',
                  }}
                >
                  {kindChipLabel(kind)}
                  {count > 1 ? ` ×${count}` : ''}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTabs({
  activeId,
  onSelect,
  tileCount,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  tileCount: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 14,
        flexWrap: 'wrap',
      }}
    >
      {BAND_TILE_SECTIONS.map((section) => {
        const isActive = section.id === activeId;
        const count = section.tileIds ? section.tileIds.length : BAND_TILES.length;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 7,
              border: isActive
                ? '1px solid rgba(249,115,22,0.6)'
                : '1px solid rgba(255,255,255,0.08)',
              background: isActive ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              transition: 'border-color 0.12s, background 0.12s',
              outline: 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--sx-mono, monospace)',
                fontSize: 10,
                fontWeight: isActive ? 700 : 400,
                letterSpacing: '0.1em',
                color: isActive ? '#F97316' : 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
              }}
            >
              {section.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--sx-mono, monospace)',
                fontSize: 9,
                color: isActive ? 'rgba(249,115,22,0.6)' : 'rgba(255,255,255,0.2)',
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
      <span
        style={{
          marginLeft: 'auto',
          fontFamily: 'var(--sx-mono, monospace)',
          fontSize: 10,
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.06em',
        }}
      >
        {tileCount} tile{tileCount !== 1 ? 's' : ''} · OSINT
      </span>
    </div>
  );
}

function DefaultBandTileGrid() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('all');

  const toggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleSectionSelect = useCallback((id: string) => {
    setActiveSectionId(id);
    setExpandedId(null);
  }, []);

  const activeSection = BAND_TILE_SECTIONS.find((s) => s.id === activeSectionId)!;
  const visibleTiles = activeSection.tileIds
    ? BAND_TILES.filter((t) => activeSection.tileIds!.includes(t.id))
    : BAND_TILES;

  return (
    <div>
      <SectionTabs
        activeId={activeSectionId}
        onSelect={handleSectionSelect}
        tileCount={visibleTiles.length}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
          padding: '8px 12px',
          borderRadius: 8,
          background: 'rgba(6,182,212,0.04)',
          border: '1px solid rgba(6,182,212,0.08)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--sx-mono, monospace)',
            fontSize: 9,
            letterSpacing: '0.12em',
            color: '#06B6D4',
            textTransform: 'uppercase',
          }}
        >
          Band Tiles
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flex: 1 }}>
          Hover emission bars for frequency range · allocation bars for intel · Click tile to expand
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {visibleTiles.map((tile) => (
          <TileCard
            key={tile.id}
            tile={tile}
            expanded={expandedId === tile.id}
            onExpand={() => toggle(tile.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function BandTileGrid(props?: BandTileGridProps) {
  if (!props) {
    return <DefaultBandTileGrid />;
  }
  return <BandTileGridConfigured {...props} />;
}

function BandTileGridConfigured(props: BandTileGridProps) {
  const {
    emissions = [],
    tiles,
    compact = false,
    fullscreenExpand = false,
    activeOnly = false,
    showRecommendations: _showRecommendations,
    onTileClick,
    showSpectrumPulse = true,
    spectrumPulseProminent = false,
  } = props;

  const catalog = tiles ?? BAND_TILES;

  const visibleTiles = useMemo(() => {
    if (!activeOnly || emissions.length === 0) return catalog;
    const ids = new Set(activeTileIds(emissions));
    return catalog.filter((t) => ids.has(t.id));
  }, [activeOnly, emissions, catalog]);

  return (
    <div>
      {!compact && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 10,
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(6,182,212,0.04)',
            border: '1px solid rgba(6,182,212,0.08)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--sx-mono, monospace)',
              fontSize: 9,
              letterSpacing: '0.12em',
              color: '#06B6D4',
              textTransform: 'uppercase',
            }}
          >
            Laydown EW bands
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
            {visibleTiles.length} active tile{visibleTiles.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: compact ? 8 : 14,
        }}
      >
        {visibleTiles.map((tile) => (
          <TileCard
            key={tile.id}
            tile={tile}
            expanded={false}
            onExpand={() => onTileClick?.(tile)}
            emissions={emissions}
            compact={compact}
            fullscreenExpand={fullscreenExpand}
            onTileClick={onTileClick}
            showSpectrumPulse={showSpectrumPulse}
            spectrumPulseProminent={spectrumPulseProminent}
          />
        ))}
      </div>
    </div>
  );
}
