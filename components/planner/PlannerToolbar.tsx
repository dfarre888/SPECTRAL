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
  const btn = 'px-2 py-1 rounded border text-[10px] font-mono font-semibold transition-colors';
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-xl border border-zinc-700 bg-[#0A0A0F]/90 backdrop-blur-sm shadow-lg max-w-[95vw]">
      <span className="text-[10px] font-mono text-cyan truncate max-w-[140px]" title={props.planName}>
        {props.planId ? props.planName : 'Unsaved laydown'}
      </span>
      <button type="button" className={cn(btn, 'border-zinc-600 hover:border-cyan text-zinc-200')} onClick={props.onSave} disabled={props.saving}>
        {props.saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" className={cn(btn, 'border-zinc-600 hover:border-cyan text-zinc-200')} onClick={props.onNew}>New</button>
      <button type="button" className={cn(btn, 'border-zinc-600 hover:border-cyan text-zinc-200')} onClick={props.onLoadClick}>Load</button>
      <button type="button" className={cn(btn, 'border-orange-500/50 text-orange hover:bg-orange/10')} onClick={props.onPublishWopr}>WOPR</button>
      <button type="button" className={cn(btn, 'border-purple-500/50 text-purple hover:bg-purple/10')} onClick={props.onPublishPcm}>PCM</button>
      <Link href="/planner" className={cn(btn, 'border-cyan/40 text-cyan')}>Library</Link>
      {props.lastSaved && (
        <span className="text-[9px] font-mono text-zinc-500">saved {props.lastSaved.toLocaleTimeString()}</span>
      )}
      {props.error && <span className="text-[9px] font-mono text-red">{props.error}</span>}
    </div>
  );
}
