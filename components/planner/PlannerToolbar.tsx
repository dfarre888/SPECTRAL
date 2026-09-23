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
  const btn = 'btn-e sm';
  return (
    <div className="flex flex-wrap items-center gap-0.5 min-h-8">
      <span className="text-[12px] text-[var(--store-ink-soft)] truncate max-w-[180px] px-2" title={props.planName}>
        {props.planId ? props.planName : 'Unsaved laydown'}
      </span>
      <button type="button" className={cn(btn, '')} onClick={props.onSave} disabled={props.saving}>
        {props.saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" className={cn(btn, '')} onClick={props.onNew}>New</button>
      <button type="button" className={cn(btn, '')} onClick={props.onLoadClick}>Load</button>
      <button type="button" className={cn(btn, '')} onClick={props.onPublishWopr}>WOPR</button>
      <button type="button" className={cn(btn, '')} onClick={props.onPublishPcm}>PCM</button>
      <Link href="/planner" className={cn(btn, '')}>Library</Link>
      {props.lastSaved && (
        <span className="text-[12px] store-text-muted">Saved <span className="font-mono">{props.lastSaved.toLocaleTimeString()}</span></span>
      )}
      {props.error && <span className="text-[12px] text-[#FF8A98]">{props.error}</span>}
    </div>
  );
}
