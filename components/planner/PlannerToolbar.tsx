'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PlannerToolbarProps {
  planName: string;
  planId: string | null;
  saving: boolean;
  lastSaved: Date | null;
  error: string | null;
  onSave: () => void;
  onNew: () => void;
  onLoadClick: () => void;
  onPublishWopr: () => void;
  onPublishPcm: () => void;
}

export function PlannerToolbar(props: PlannerToolbarProps) {
  const link = 'map-press map-chip px-0 py-1 text-[11px] font-medium';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-h-8">
      <span className="text-[12px] text-[var(--store-ink)] truncate max-w-[160px]" title={props.planName}>
        {props.planId ? props.planName : 'Unsaved laydown'}
      </span>
      <button type="button" className={cn(link, 'store-text-muted hover:text-[var(--store-ink)]')} onClick={props.onSave} disabled={props.saving}>
        {props.saving ? 'Saving' : 'Save'}
      </button>
      <button type="button" className={cn(link, 'store-text-muted hover:text-[var(--store-ink)]')} onClick={props.onNew}>New</button>
      <button type="button" className={cn(link, 'store-text-muted hover:text-[var(--store-ink)]')} onClick={props.onLoadClick}>Load</button>
      <button type="button" className={cn(link, 'text-[var(--store-accent)]')} onClick={props.onPublishWopr}>WOPR</button>
      <button type="button" className={cn(link, 'text-[var(--store-accent)]')} onClick={props.onPublishPcm}>PCM</button>
      <Link href="/planner" className={cn(link, 'store-text-muted hover:text-[var(--store-ink)]')}>Library</Link>
      {props.lastSaved && (
        <span className="text-[10px] store-text-muted">saved {props.lastSaved.toLocaleTimeString()}</span>
      )}
      {props.error && <span className="text-[10px] text-red">{props.error}</span>}
    </div>
  );
}
