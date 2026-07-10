'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { serializeLaydown, hydrateLaydown, type MapLaydownDocument } from '@/lib/planner/battlespace-plan';
import type { MapAssetsPayload, PlacedCuas, PlacedEffector, PlacedRadar, PlacedUas } from '@/lib/map/types';
import type { LaydownSessionPair } from '@/lib/map/laydown-session';

interface LaydownSetters {
  setPlacedUas: (v: PlacedUas[] | ((p: PlacedUas[]) => PlacedUas[])) => void;
  setPlacedCuas: (v: PlacedCuas[] | ((p: PlacedCuas[]) => PlacedCuas[])) => void;
  setPlacedRadars: (v: PlacedRadar[] | ((p: PlacedRadar[]) => PlacedRadar[])) => void;
  setPlacedEffectors: (v: PlacedEffector[] | ((p: PlacedEffector[]) => PlacedEffector[])) => void;
}

export function useBattlespacePlan(
  assets: MapAssetsPayload,
  laydown: {
    placedUas: PlacedUas[];
    placedCuas: PlacedCuas[];
    placedRadars: PlacedRadar[];
    placedEffectors: PlacedEffector[];
  },
  setters: LaydownSetters,
  adjudicationPairs?: LaydownSessionPair[],
) {
  const [planId, setPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('Untitled plan');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyLaydown = useCallback(
    (doc: MapLaydownDocument) => {
      const hydrated = hydrateLaydown(doc, assets);
      setters.setPlacedUas(hydrated.placedUas);
      setters.setPlacedCuas(hydrated.placedCuas);
      setters.setPlacedRadars(hydrated.placedRadars);
      setters.setPlacedEffectors(hydrated.placedEffectors);
    },
    [assets, setters],
  );

  const savePlan = useCallback(async (name?: string) => {
    setSaving(true);
    setError(null);
    try {
      const laydownDoc = serializeLaydown(laydown);
      if (planId) {
        const res = await fetch(`/api/v1/plans/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name ?? planName,
            laydown: laydownDoc,
            adjudication_pairs: adjudicationPairs ?? null,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        setLastSaved(new Date());
      } else {
        const res = await fetch('/api/v1/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name ?? planName, laydown: laydownDoc }),
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setPlanId(json.data.id);
        setPlanName(json.data.name);
        setLastSaved(new Date());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [planId, planName, laydown, adjudicationPairs]);

  const loadPlan = useCallback(async (id: string) => {
    setError(null);
    const res = await fetch(`/api/v1/plans/${id}`);
    if (!res.ok) {
      setError('Load failed');
      return;
    }
    const json = await res.json();
    setPlanId(json.data.id);
    setPlanName(json.data.name);
    applyLaydown(json.data.laydown);
  }, [applyLaydown]);

  const newPlan = useCallback(() => {
    setPlanId(null);
    setPlanName('Untitled plan');
    setters.setPlacedUas([]);
    setters.setPlacedCuas([]);
    setters.setPlacedRadars([]);
    setters.setPlacedEffectors([]);
  }, [setters]);

  const publishWopr = useCallback(async () => {
    if (!planId) await savePlan();
    const id = planId;
    if (!id) return null;
    const res = await fetch(`/api/v1/plans/${id}/publish/wopr`, { method: 'POST' });
    if (!res.ok) throw new Error('WOPR publish failed');
    const json = await res.json();
    return (json.data?.scenario?.id ?? json.data?.woprScenarioId) as string;
  }, [planId, savePlan]);

  const publishPcm = useCallback(async () => {
    if (!planId) await savePlan();
    const id = planId;
    if (!id) return null;
    const res = await fetch(`/api/v1/plans/${id}/publish/pcm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!res.ok) throw new Error('PCM publish failed');
    const json = await res.json();
    return json.data?.exerciseId as string;
  }, [planId, savePlan]);

  useEffect(() => {
    if (!planId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void savePlan();
    }, 30_000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [planId, laydown, savePlan]);

  return {
    planId,
    planName,
    setPlanName,
    saving,
    lastSaved,
    error,
    savePlan,
    loadPlan,
    newPlan,
    publishWopr,
    publishPcm,
    applyLaydown,
  };
}
