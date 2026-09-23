'use client';
/**
 * /spectrum — Spectrum Intelligence + F3 kill-chain app shell.
 * Full-bleed. One scroller for the module, a glass view switcher that rides
 * the top of it, and the AeroCopilot dock floating at the bottom of the
 * content area (never over the app sidebar), wired to drive navigation,
 * selection and laydown.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin } from 'lucide-react';
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
import type { AccreditedWaveformProfile } from '@/lib/operations/accredited-supplements-data';
import type { GnssConstellation, GnssPlatformDependency } from '@/lib/gnss/gnss-types';

type Page = 'overview' | 'library' | 'detail' | 'engagement' | 'spectrum' | 'radar' | 'effectors' | 'evolution' | 'map';

const NAV: { key: Page; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'library', label: 'Threat Library' },
  { key: 'spectrum', label: 'Spectrum' },
  { key: 'radar', label: 'Radar' },
  { key: 'effectors', label: 'Effectors' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'evolution', label: 'Evolution' },
];

const PAGE_META: Record<Page, { title: string; lede: string }> = {
  overview: {
    title: 'Operational overview',
    lede: 'Electromagnetic posture across the loaded library: where threats emit, which bands are congested, and how much of the Red link picture Blue can reach.',
  },
  library: {
    title: 'Threat and effector library',
    lede: 'Every Red threat and Blue system in the spectrum library. Click a row to highlight it across views, or a name to open its dossier.',
  },
  detail: {
    title: 'Platform dossier',
    lede: 'Spectral footprint, key specifications and defeat assessment.',
  },
  engagement: {
    title: 'Engagement planner',
    lede: 'Pick a Red threat and a Blue effector. The overlay shows where Blue coverage meets a Red dependency; the verdict explains the outcome.',
  },
  spectrum: {
    title: 'Spectrum workspace',
    lede: 'Bands by physics on log scales: RF, GNSS, EO/IR and CBRN. Toggle layers, add platforms to compare, or switch to band tiles.',
  },
  radar: {
    title: 'Radar order of battle',
    lede: 'Every catalogued radar by its actual frequency span, Blue above the axis and Red below. Hover a bar for range and detection envelope.',
  },
  effectors: {
    title: 'Effector matrix',
    lede: 'Layered air defence from strategic BMD to counter-UAS, with engagement envelope, Pk, magazine and cost per shot. Select effectors to stage them on the map.',
  },
  evolution: {
    title: 'Evolution arc',
    lede: 'How a platform migrates across the spectrum generation by generation, and how the defeat verdict shifts with it.',
  },
  map: {
    title: 'Staged laydown',
    lede: 'Systems staged for Map Intel. Effectors render as engagement envelopes, radars as detection volumes.',
  },
};

export interface SpectrumAppClientProps {
  accreditedWaveforms?: AccreditedWaveformProfile[];
  constellations?: GnssConstellation[];
  gnssVulnerabilities?: GnssPlatformDependency[];
}

export default function SpectrumAppClient({
  accreditedWaveforms,
  constellations,
  gnssVulnerabilities,
}: SpectrumAppClientProps) {
  const { platforms } = usePlatforms();
  const radars = useRadars();
  const effectors = useEffectors();

  const [page, setPage] = useState<Page>('overview');
  const [detailId, setDetailId] = useState<string | null>('shahed-136');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [engagementPair, setEngagementPair] = useState<{ red?: string; blue?: string }>({});
  const [dockH, setDockH] = useState(120);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const detailPlatform = usePlatform(detailId);

  // Each view starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page, detailId]);

  const onScroll = useCallback(() => {
    const y = scrollRef.current?.scrollTop ?? 0;
    setScrolled((prev) => (prev === y > 4 ? prev : y > 4));
  }, []);

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

  const activeTab = page === 'detail' ? 'library' : page;
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + NAV.length) % NAV.length;
    setPage(NAV[next].key);
    tabRefs.current[next]?.focus();
  };

  const meta = PAGE_META[page];
  const title = page === 'detail' && detailPlatform ? detailPlatform.name : meta.title;

  return (
    <div
      className="sx-root"
      data-scrolled={scrolled ? 'true' : 'false'}
      style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      <style dangerouslySetInnerHTML={{ __html: SPECTRUM_CSS }} />
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingBottom: dockH + 36 }}
      >
        {/* view switcher: glass once content scrolls beneath it */}
        <div className="sx-bar sx-pad">
          <div role="tablist" aria-label="Spectrum views" className="seg accent">
            {NAV.map((n, i) => {
              const on = activeTab === n.key;
              return (
                <button
                  key={n.key}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setPage(n.key)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  {n.label}
                </button>
              );
            })}
          </div>
          <div className="sx-cap" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            <span className="sx-mono" style={{ color: 'var(--store-ink-soft)' }}>{platforms.length}</span> platforms
            <span aria-hidden> · </span>
            <span className="sx-mono" style={{ color: 'var(--store-ink-soft)' }}>{radars.length}</span> radars
            <span aria-hidden> · </span>
            <span className="sx-mono" style={{ color: 'var(--store-ink-soft)' }}>{effectors.length}</span> effectors
          </div>
        </div>

        <div className="sx-pad" style={{ paddingTop: 14 }}>
          <header style={{ marginBottom: 20 }}>
            {page === 'detail' && (
              <button type="button" className="fc-action" onClick={() => setPage('library')} style={{ marginBottom: 6 }}>
                <ChevronLeft size={14} aria-hidden />
                Threat library
              </button>
            )}
            <h1 className="page-title">{title}</h1>
            <p className="page-lede">{meta.lede}</p>
          </header>

          {page === 'overview' && <CommandOverview onNavigate={(p) => setPage(p as Page)} />}
          {page === 'library' && (
            <ThreatLibrary onOpen={openDetail} onSelect={toggleSelect} selectedIds={[...selectedIds, ...highlightIds]} />
          )}
          {page === 'detail' && detailPlatform && <PlatformDetail platform={detailPlatform} />}
          {page === 'engagement' && (
            <EngagementPlanner
              initialRed={engagementPair.red}
              initialBlue={engagementPair.blue}
              key={`${engagementPair.red}-${engagementPair.blue}`}
            />
          )}
          {page === 'spectrum' && (
            <SpectrumWorkspace
              accreditedWaveforms={accreditedWaveforms}
              constellations={constellations}
              gnssVulnerabilities={gnssVulnerabilities}
              initialSelectedIds={[...selectedIds, ...highlightIds]}
            />
          )}
          {page === 'radar' && <RadarSpectrum onSelect={toggleSelect} selectedIds={[...selectedIds, ...highlightIds]} />}
          {page === 'effectors' && (
            <EffectorMatrix onSelect={toggleSelect} selectedIds={selectedIds} onStageLaydown={stageLaydown} />
          )}
          {page === 'evolution' && (
            <EvolutionArc platform={detailPlatform ?? ({ id: 'shahed-136', name: 'Shahed-136', side: 'red' } as Platform)} />
          )}
          {page === 'map' && (
            <MapPlaceholder highlightIds={highlightIds} platforms={platforms} radars={radars} effectors={effectors} />
          )}
        </div>
      </div>

      <AeroCopilotDock
        platforms={platforms}
        radars={radars}
        effectors={effectors}
        onAction={handleCopilotAction}
        onHeightChange={setDockH}
      />
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
    <section className="sx-glass" style={{ padding: 0, overflow: 'hidden', maxWidth: 1100 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          padding: '18px 22px',
          borderBottom: '1px solid var(--store-line)',
        }}
      >
        <div>
          <h2 className="sx-h">Engagement geometry</h2>
          <p className="sx-cap" style={{ marginTop: 4, maxWidth: '72ch', lineHeight: 1.5 }}>
            {items.length} system{items.length === 1 ? '' : 's'} staged. Overlapping envelopes show layered coverage; the
            seam between them is the gap to plan around or plug.
          </p>
        </div>
        {items.length > 0 && (
          <button type="button" onClick={openInMapIntel} className="btn-glass primary">
            <MapPin size={15} aria-hidden />
            Open in Map Intel
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="sx-cap" style={{ padding: '28px 22px', fontSize: 13 }}>
          Ask AeroCopilot to defeat a threat or stage a laydown, or stage effectors from the Effector matrix.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((it, i) => {
            const isEffector = 'envelope' in it && it.envelope != null;
            const isRadar = 'bands' in it;
            return (
              <li
                key={it.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 22px',
                  borderTop: i === 0 ? 0 : '1px solid rgba(255,255,255,0.055)',
                }}
              >
                <PlatformThumbnail id={it.id} name={it.name} size="sm" variant={isEffector ? 'cuas' : 'uas'} rounded="lg" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--store-ink)' }}>{it.name}</div>
                  <div className="sx-mono" style={{ fontSize: 12, color: 'var(--store-ink-mute)', marginTop: 2 }}>
                    {isEffector
                      ? `Engages ${(it as EffectorSystem).envelope.min_range_km} to ${(it as EffectorSystem).envelope.max_range_km} km, altitude ${(it as EffectorSystem).envelope.min_alt_km} to ${(it as EffectorSystem).envelope.max_alt_km} km`
                      : isRadar
                        ? `${(it as RadarSystem).bands.join('/')}-band, about ${(it as RadarSystem).instrumented_range_km ?? '?'} km`
                        : `${(it as Platform).category ?? 'platform'}`}
                  </div>
                </div>
                <span className="tag">{isEffector ? 'Envelope' : isRadar ? 'Detection volume' : 'Place'}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
