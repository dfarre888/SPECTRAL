'use client';
/**
 * BandTileGrid — Band Tiles view mode for SpectrumWorkspace.
 *
 * Renders all 16 spectrum band overlay tiles in a responsive grid
 * behind a 6-tab section navigator (ALL / RF / Microwave / Optical·DEW / Ionising / Radar).
 *
 * Each tile composites:
 *   - Dark radial-gradient background
 *   - SVG overlay as <img> (preserves crisp vector rendering)
 *   - Absolutely-positioned transparent <div> hit areas over the
 *     allocation bars, computed as viewBox percentage coordinates.
 *
 * Click tile → expands full-width with a larger overlay view.
 * Hover allocation box → tooltip with label + detail text.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  BAND_TILES,
  BAND_TILE_SECTIONS,
  type AllocationBox,
  type BandTile,
} from './band-tile-data';

/* ─── ViewBox constants ────────────────────────────────────────────────────── */
const VB_W = 680;

/* ─── Tooltip state ─────────────────────────────────────────────────────────── */
interface TooltipState {
  box: AllocationBox;
  /** position relative to the tile card container */
  left: number;
  top: number;
}

/* ─── Allocation hit area overlay ─────────────────────────────────────────── */
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

  /** Scale from SVG viewBox coords to rendered percentage */
  const pct = useCallback(
    (svgX: number, svgW: number, svgY: number, svgH_row: number) => ({
      left:   `${(svgX / VB_W) * 100}%`,
      width:  `${(svgW / VB_W) * 100}%`,
      top:    `${(svgY / tile.viewBoxH) * 100}%`,
      height: `${(svgH_row / tile.viewBoxH) * 100}%`,
    }),
    [tile.viewBoxH]
  );

  return (
    <div
      ref={imgRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
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
              const tileRect = e.currentTarget
                .closest('[data-tile-card]')
                ?.getBoundingClientRect();
              if (tileRect) onHover(box, boxRect, tileRect);
            }}
            onMouseLeave={onLeave}
          />
        );
      })}
    </div>
  );
}

/* ─── Tooltip panel ─────────────────────────────────────────────────────────── */
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
      <div
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.75)',
          lineHeight: 1.55,
        }}
      >
        {state.box.detail}
      </div>
    </div>
  );
}

/* ─── Single tile card ──────────────────────────────────────────────────────── */
function TileCard({
  tile,
  expanded,
  onExpand,
}: {
  tile: BandTile;
  expanded: boolean;
  onExpand: () => void;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleHover = useCallback(
    (box: AllocationBox, boxRect: DOMRect, tileRect: DOMRect) => {
      setTooltip({
        box,
        left: boxRect.left - tileRect.left + boxRect.width / 2,
        top: boxRect.top - tileRect.top,
      });
    },
    []
  );

  const aspectPad = `${(tile.viewBoxH / VB_W) * 100}%`;

  return (
    <div
      data-tile-card=""
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        border: expanded
          ? '1px solid rgba(249,115,22,0.5)'
          : '1px solid rgba(255,255,255,0.06)',
        background: 'radial-gradient(ellipse at 30% 40%, #0D1B2E 0%, #0A0A0F 70%)',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        gridColumn: expanded ? '1 / -1' : undefined,
      }}
      onClick={() => { if (!expanded && !tooltip) onExpand(); }}
      onMouseLeave={() => setTooltip(null)}
    >
      {/* aspect-ratio wrapper */}
      <div style={{ position: 'relative', paddingBottom: aspectPad }}>
        {/* SVG overlay image */}
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
          }}
          draggable={false}
        />
        {/* allocation box hit areas */}
        <AllocationHitAreas
          tile={tile}
          onHover={handleHover}
          onLeave={() => setTooltip(null)}
        />
        {/* tooltip */}
        {tooltip && <Tooltip state={tooltip} expanded={expanded} />}
      </div>

      {/* card footer */}
      <div
        style={{
          padding: '9px 13px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          background: 'rgba(0,0,0,0.35)',
        }}
        onClick={(e) => { e.stopPropagation(); onExpand(); }}
      >
        <span
          style={{
            fontFamily: 'var(--sx-mono, monospace)',
            fontWeight: 700,
            fontSize: expanded ? 15 : 12,
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
            fontSize: 10,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.04em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {tile.range}
        </span>
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
      </div>
    </div>
  );
}

/* ─── Section tab bar ────────────────────────────────────────────────────────── */
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
              background: isActive
                ? 'rgba(249,115,22,0.12)'
                : 'rgba(255,255,255,0.03)',
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

/* ─── Main grid ──────────────────────────────────────────────────────────────── */
export function BandTileGrid() {
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('all');

  const toggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleSectionSelect = useCallback((id: string) => {
    setActiveSectionId(id);
    setExpandedId(null); // collapse any open tile when switching section
  }, []);

  /* Filter tiles by active section */
  const activeSection = BAND_TILE_SECTIONS.find((s) => s.id === activeSectionId)!;
  const visibleTiles = activeSection.tileIds
    ? BAND_TILES.filter((t) => activeSection.tileIds!.includes(t.id))
    : BAND_TILES;

  return (
    <div>
      {/* section tabs */}
      <SectionTabs
        activeId={activeSectionId}
        onSelect={handleSectionSelect}
        tileCount={visibleTiles.length}
      />

      {/* info bar */}
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
          Hover allocation bars for intelligence · Click tile to expand
        </span>
      </div>

      {/* tile grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
        }}
      >
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
