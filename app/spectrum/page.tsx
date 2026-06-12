'use client';
/**
 * /spectrum — Spectrum Intelligence + F3 kill-chain app shell.
 * Full-bleed. Glass rail nav, all frames, radar EW canvas, effector matrix,
 * persistent AeroCopilot dock wired to drive navigation, selection, and laydown.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Platform } from '@/lib/spectrum/types';
import { writeMapStaging } from '@/lib/spectrum/map-staging';
import type { RadarSystem } from '@/lib/spectrum/radar-types';
import type { EffectorSystem } from '@/lib/spectrum/effector-types';
import type { CopilotAction } from '@/lib/spectrum/aerocopilot';
import { SPECTRUM_CSS } from '@/components/spectrum/tokens';
import { CommandOverview } from '@/components/spectrum/CommandOverview';
import { ThreatLibrary } from '@/components/spectrum/ThreatLibrary';
import { PlatformDetail } from '@/components/spectrum/PlatformDetail';
import { EngagementPlanner } from '@/components/spectrum/EngagementPlanner';
import { SpectrumWorkspace } from '@/components/spectrum/SpectrumWorkspace';
import { EvolutionArc } from '@/components/spectrum/EvolutionArc';
import { RadarSpectrum } from '@/components/spectrum/RadarSpectrum';
import { EffectorMatrix } from '@/components/spectrum/EffectorMatrix';
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail';
import { AeroCopilotDock } from '@/components/spectrum/AeroCopilotDock';
import { usePlatform, usePlatforms } from '@/components/spectrum/data';
import { useRadars } from '@/components/spectrum/radar-data';
import { useEffectors } from '@/components/spectrum/effector-data';

type Page = 'overview' | 'library' | 'detail' | 'engagement' | 'spectrum' | 'radar' | 'effectors' | 'evolution' | 'map';

const NAV: { key: Page; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '\u25C8' },
  { key: 'library', label: 'Threat Library', icon: '\u229E' },
  { key: 'spectrum', label: 'Spectrum', icon: '\u27C1' },
  { key: 'radar', label: 'Radar', icon: '\u25CE' },
  { key: 'effectors', label: 'Effectors', icon: '\u2316' },
  { key: 'engagement', label: 'Engagement', icon: '\u2295' },
  { key: 'evolution', label: 'Evolution', icon: '\u25F7' },
];

export default function SpectrumApp() {
  const { platforms } = usePlatforms();
  const radars = useRadars();
  const effectors = useEffectors();

  const [page, setPage] = useState<Page>('overview');
  const [detailId, setDetailId] = useState<string | null>('shahed-136');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [engagementPair, setEngagementPair] = useState<{ red?: string; blue?: string }>({});

  const detailPlatform = usePlatform(detailId);

  const openDetail = (p: Platform) => {
    setDetailId(p.id);
    setPage('detail');
  };
  const toggleSelect = (x: Platform | RadarSystem | EffectorSystem) => {
    setSelectedIds((prev) => (prev.includes(x.id) ? prev.filter((i) => i !== x.id) : [...prev, x.id]));
  };
  const stageLaydown = (ids: string[]) => {
    setHighlightIds(ids);
    setPage('map');
  };

  const handleCopilotAction = (a: CopilotAction) => {
    if (a.highlightIds) setHighlightIds(a.highlightIds);
    if (a.selectRedId || a.selectBlueId) setEngagementPair({ red: a.selectRedId, blue: a.selectBlueId });
    if (a.placeIds) setHighlightIds(a.placeIds);
    if (a.detailId) setDetailId(a.detailId);
    if (a.navigate) {
      const map: Record<string, Page> = {
        overview: 'overview',
        library: 'library',
        detail: 'detail',
        engagement: 'engagement',
        spectrum: 'spectrum',
        radar: 'radar',
        effectors: 'effectors',
        evolution: 'evolution',
        map: 'map',
      };
      setPage(map[a.navigate] ?? 'overview');
    }
  };

  return (
    <div className="sx-root" style={{ minHeight: '100%' }}>
      <style dangerouslySetInnerHTML={{ __html: SPECTRUM_CSS }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1320, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '188px 1fr', gap: 22 }}>
          <div className="sx-glass" style={{ padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 22, height: 'fit-content', position: 'sticky', top: 24 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, var(--sx-orange), #c2410c)', boxShadow: '0 8px 22px -6px var(--sx-orange)' }} />
              <div>
                <div className="sx-display" style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.02em' }}>SPECTRA</div>
                <div className="sx-mono sx-faint" style={{ fontSize: 9, marginTop: 2 }}>← SPECTRAL</div>
              </div>
            </Link>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NAV.map((n) => {
                const active = page === n.key || (n.key === 'library' && page === 'detail');
                return (
                  <button
                    key={n.key}
                    onClick={() => setPage(n.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 13,
                      fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                      background: active ? 'linear-gradient(100deg, rgba(249,115,22,0.16), rgba(249,115,22,0.04))' : 'none',
                      color: active ? 'var(--sx-ink)' : 'var(--sx-ink-dim)',
                      border: active ? '1px solid rgba(249,115,22,0.28)' : '1px solid transparent',
                      boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none', textAlign: 'left',
                    }}
                  >
                    <span style={{ width: 17, opacity: active ? 1 : 0.8 }}>{n.icon}</span>
                    {n.label}
                  </button>
                );
              })}
            </nav>
            <div style={{ marginTop: 'auto', padding: 13, borderRadius: 14, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}>
              <div className="sx-mono" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--sx-green)', textTransform: 'uppercase' }}>Inventory</div>
              <div style={{ fontSize: 11.5, marginTop: 5, lineHeight: 1.5 }}>
                {platforms.length} platforms<br />
                {radars.length} radars · {effectors.length} effectors
              </div>
            </div>
          </div>

          <main style={{ minWidth: 0 }}>
            <PageHeader page={page} detailName={detailPlatform?.name} />
            {page === 'overview' && <CommandOverview onNavigate={(p) => setPage(p as Page)} />}
            {page === 'library' && (
              <ThreatLibrary onOpen={openDetail} onSelect={toggleSelect} selectedIds={[...selectedIds, ...highlightIds]} />
            )}
            {page === 'detail' && detailPlatform && <PlatformDetail platform={detailPlatform} />}
            {page === 'engagement' && (
              <EngagementPlanner initialRed={engagementPair.red} initialBlue={engagementPair.blue} key={`${engagementPair.red}-${engagementPair.blue}`} />
            )}
            {page === 'spectrum' && <SpectrumWorkspace />}
            {page === 'radar' && (
              <RadarSpectrum onSelect={toggleSelect} selectedIds={[...selectedIds, ...highlightIds]} />
            )}
            {page === 'effectors' && (
              <EffectorMatrix onSelect={toggleSelect} selectedIds={selectedIds} onStageLaydown={stageLaydown} />
            )}
            {page === 'evolution' && (
              <EvolutionArc platform={detailPlatform ?? ({ id: 'shahed-136', name: 'Shahed-136', side: 'red' } as Platform)} />
            )}
            {page === 'map' && (
              <MapPlaceholder highlightIds={highlightIds} platforms={platforms} radars={radars} effectors={effectors} />
            )}
          </main>
        </div>
      </div>

      <AeroCopilotDock platforms={platforms} radars={radars} effectors={effectors} onAction={handleCopilotAction} />
    </div>
  );
}

function PageHeader({ page, detailName }: { page: Page; detailName?: string }) {
  const meta: Record<Page, { kicker: string; title: string }> = {
    overview: { kicker: 'COMMAND', title: 'Operational Overview' },
    library: { kicker: 'CATALOGUE', title: 'Threat & Effector Library' },
    detail: { kicker: 'DOSSIER', title: detailName ?? 'Platform Detail' },
    engagement: { kicker: 'PLANNER', title: 'Engagement Planner' },
    spectrum: { kicker: 'ANALYSIS', title: 'Spectrum Workspace' },
    radar: { kicker: 'SENSORS', title: 'Radar Order of Battle' },
    effectors: { kicker: 'FIND \u00B7 FIX \u00B7 FINISH', title: 'Effector Matrix' },
    evolution: { kicker: 'TIMELINE', title: 'Evolution Arc' },
    map: { kicker: 'TACTICAL', title: 'Map \u2014 Engagement Geometry' },
  };
  const m = meta[page];
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="sx-mono" style={{ fontSize: 11, letterSpacing: '0.32em', color: 'var(--sx-orange-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 28, height: 1, background: 'linear-gradient(90deg, var(--sx-orange), transparent)' }} />
        {m.kicker}
      </div>
      <h1 className="sx-display" style={{ fontWeight: 600, fontSize: 28, letterSpacing: '-0.02em', marginTop: 12 }}>
        {m.title}
      </h1>
    </div>
  );
}

function MapPlaceholder({
  highlightIds,
  platforms,
  radars,
  effectors,
}: {
  highlightIds: string[];
  platforms: Platform[];
  radars: RadarSystem[];
  effectors: EffectorSystem[];
}) {
  const router = useRouter();
  const items = highlightIds
    .map((id) => effectors.find((e) => e.id === id) ?? radars.find((r) => r.id === id) ?? platforms.find((p) => p.id === id))
    .filter(Boolean) as (EffectorSystem | RadarSystem | Platform)[];

  const openInMapIntel = () => {
    writeMapStaging({ placeIds: highlightIds, highlightIds });
    router.push('/map?from=spectra');
  };

  return (
    <div className="sx-glass" style={{ padding: 28, borderRadius: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div className="sx-display" style={{ fontWeight: 600, fontSize: 16 }}>Engagement Geometry — staged laydown</div>
        {items.length > 0 && (
          <button
            onClick={openInMapIntel}
            style={{
              padding: '9px 16px',
              borderRadius: 11,
              fontSize: 12,
              fontWeight: 600,
              background: 'var(--sx-orange)',
              color: '#0a0c0e',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Open in Map Intel →
          </button>
        )}
      </div>
      <div className="sx-dim" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6, maxWidth: '80ch' }}>
        {items.length} system{items.length === 1 ? '' : 's'} staged. Each effector renders as a 3D engagement envelope (range ring + altitude band + no-escape zone); each radar as a detection volume. Overlapping envelopes show layered coverage — the seam is the gap to plan around (or plug).
      </div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 && (
          <div className="sx-faint" style={{ fontSize: 12 }}>
            Ask AeroCopilot to defeat a threat or stage a laydown, or stage effectors from the Effector Matrix.
          </div>
        )}
        {items.map((it) => {
          const isEffector = 'envelope' in it && it.envelope != null;
          const isRadar = 'bands' in it;
          return (
            <div key={it.id} className="sx-glass" style={{ padding: '12px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <PlatformThumbnail
                id={it.id}
                name={it.name}
                size="sm"
                variant={isEffector ? 'cuas' : 'uas'}
                rounded="lg"
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{it.name}</div>
                <div className="sx-faint sx-mono" style={{ fontSize: 10 }}>
                  {isEffector
                    ? `engage ${(it as EffectorSystem).envelope.min_range_km}–${(it as EffectorSystem).envelope.max_range_km} km · alt ${(it as EffectorSystem).envelope.min_alt_km}–${(it as EffectorSystem).envelope.max_alt_km} km`
                    : isRadar
                      ? `${(it as RadarSystem).bands.join('/')}-band · ~${(it as RadarSystem).instrumented_range_km ?? '?'} km`
                      : `${(it as Platform).category ?? 'platform'}`}
                </div>
              </div>
              <span className="sx-mono sx-faint" style={{ fontSize: 10 }}>{isEffector ? '\u25C9 envelope' : '\u2295 place'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
