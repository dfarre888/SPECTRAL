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
  const btn = 'btn-e sm font-mono';
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 min-h-8">
      <span className="text-[11px] font-mono store-text-muted truncate max-w-[160px]" title={props.planName}>
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
        <span className="text-[11px] font-mono store-text-muted">saved {props.lastSaved.toLocaleTimeString()}</span>
      )}
      {props.error && <span className="text-[11px] font-mono text-red">{props.error}</span>}
    </div>
  );
}
