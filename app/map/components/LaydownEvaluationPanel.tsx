'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { StorePanel } from '@/components/ui/store-surface'
import type {
  CommanderCompareRow,
  EvaluatedItem,
  EvaluationSection,
  LaydownEvaluation,
  SelectedLaydownItem,
} from '@/lib/map/laydown-evaluation'
import {
  commanderScoreboard,
  groupEvaluatedByIadsStack,
  isSameLaydownItem,
} from '@/lib/map/laydown-evaluation'
import { cn } from '@/lib/utils'
import { ChevronDown, Crosshair, Radar, Shield, Target } from 'lucide-react'

interface PlacedItemChip {
  kind: SelectedLaydownItem['kind']
  instanceId: string
  name: string
}

interface LaydownEvaluationPanelProps {
  evaluation: LaydownEvaluation | null
  placedItems: PlacedItemChip[]
  selectedItem: SelectedLaydownItem | null
  onSelectItem: (item: SelectedLaydownItem) => void
  onEvalItemClick: (item: EvaluatedItem) => void
  adjudicationSource?: string
  /** Detect / Defeat roll-up for every UAS on the map (shown when 2+). */
  compareRows?: CommanderCompareRow[]
}

type ScoreboardTab = 'detect' | 'defeat' | 'gaps'

const PREVIEW_LIMIT = 8

const VERDICT_LABEL: Record<'can_finish' | 'detect_only' | 'blind', string> = {
  can_finish: 'Find and finish',
  detect_only: 'Detect only',
  blind: 'Blind',
}

const KIND_LABEL: Record<SelectedLaydownItem['kind'], string> = {
  uas: 'UAS',
  cuas: 'C-UAS',
  radar: 'Radar',
  effector: 'Effector',
}

function kindIcon(kind: SelectedLaydownItem['kind']) {
  switch (kind) {
    case 'uas':
      return Target
    case 'cuas':
      return Shield
    case 'radar':
      return Radar
    default:
      return Crosshair
  }
}

function EvalRow({
  item,
  tone,
  selectedItem,
  onItemClick,
  compactStack,
}: {
  item: EvaluatedItem
  tone: 'can' | 'cannot'
  selectedItem: SelectedLaydownItem | null
  onItemClick: (item: EvaluatedItem) => void
  /** When true, parent system is shown on the stack header — omit per-row duplicate. */
  compactStack?: boolean
}) {
  const displayName =
    item.kind === 'radar' && item.natoName ? `${item.name} · ${item.natoName}` : item.name

  const selected =
    item.instanceId != null &&
    isSameLaydownItem(selectedItem, { kind: item.kind, instanceId: item.instanceId })
  const actionLabel = item.placed || item.instanceId ? 'Select on map' : 'Place on map'

  return (
    <button
      type="button"
      title={actionLabel}
      onClick={() => onItemClick(item)}
      className={cn(
        'store-panel-inner rounded-lg px-2.5 py-2 w-full text-left cursor-pointer transition-colors border',
        'hover:bg-[var(--store-surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--store-accent-border)]',
        selected
          ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)]'
          : 'border-transparent',
        tone === 'can' ? 'border-l-2 border-l-green-500/60' : 'opacity-80',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-xs font-mono truncate', tone === 'can' ? 'text-white' : 'store-text-muted')}>
          {displayName}
          {item.placed && (
            <span className="ml-1.5 text-[9px] uppercase text-[var(--store-accent)]">on map</span>
          )}
        </p>
        {item.pct != null && (
          <span
            className={cn(
              'text-[11px] font-mono shrink-0',
              tone === 'can' ? 'text-green-400' : 'store-text-muted',
            )}
          >
            {item.pct}%
          </span>
        )}
      </div>
      {item.parentSystem && !compactStack && (
        <p className="text-[9px] font-mono text-cyan-400/90 mt-0.5">{item.parentSystem}</p>
      )}
      {item.roleLabel && item.kind === 'radar' && (
        <p className="text-[9px] store-text-muted mt-0.5 capitalize">{item.roleLabel} radar</p>
      )}
      {item.linkedEffectors && item.linkedEffectors.length > 0 && (
        <p className="text-[9px] store-text-muted mt-0.5 leading-relaxed">
          <span className="text-[var(--store-accent)]/90">Finish chain: </span>
          {item.linkedEffectors.join(' · ')}
        </p>
      )}
      {item.linkedRadars && item.linkedRadars.length > 0 && (
        <p className="text-[9px] store-text-muted mt-0.5 leading-relaxed">
          <span className="text-[var(--store-accent)]/90">Cueing radar: </span>
          {item.linkedRadars.join(' · ')}
        </p>
      )}
      <p className="text-[9px] store-text-muted mt-0.5 leading-relaxed">{item.reason}</p>
    </button>
  )
}

function IadsStackBlock({
  stackKey,
  stackLabel,
  items,
  finishChainSummary,
  tone,
  defaultOpen,
  selectedItem,
  onItemClick,
}: {
  stackKey: string
  stackLabel: string
  items: EvaluatedItem[]
  finishChainSummary?: string
  tone: 'can' | 'cannot'
  defaultOpen: boolean
  selectedItem: SelectedLaydownItem | null
  onItemClick: (item: EvaluatedItem) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-[var(--store-line)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full px-2.5 py-2 text-left flex items-start gap-2 transition-colors',
          'hover:bg-[var(--store-surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--store-accent-border)]',
          tone === 'can' ? 'bg-green-950/20' : 'bg-[var(--store-surface-1)]',
        )}
      >
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 shrink-0 mt-0.5 store-text-muted transition-transform',
            !open && '-rotate-90',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-mono font-semibold text-cyan-400 truncate">{stackLabel}</p>
            <span className="text-[9px] font-mono store-text-muted shrink-0">{items.length}</span>
          </div>
          {finishChainSummary && (
            <p className="text-[9px] store-text-muted mt-0.5 leading-relaxed">
              <span className="text-[var(--store-accent)]/90">Finish chain: </span>
              {finishChainSummary}
            </p>
          )}
        </div>
      </button>
      {open && (
        <div className="space-y-1 p-1.5 pt-0">
          {items.map((item) => (
            <EvalRow
              key={`${stackKey}-${item.kind}-${item.assetId}`}
              item={item}
              tone={tone}
              selectedItem={selectedItem}
              onItemClick={onItemClick}
              compactStack
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SectionItemList({
  section,
  selectedItem,
  onItemClick,
}: {
  section: EvaluationSection
  selectedItem: SelectedLaydownItem | null
  onItemClick: (item: EvaluatedItem) => void
}) {
  const radarItems = useMemo(
    () => section.items.filter((item) => item.kind === 'radar'),
    [section.items],
  )
  const otherItems = useMemo(
    () => section.items.filter((item) => item.kind !== 'radar'),
    [section.items],
  )
  const radarGroups = useMemo(() => groupEvaluatedByIadsStack(section.items), [section.items])
  const isRadarSection = section.title.startsWith('Radars')
  const groupRadars = isRadarSection || (radarItems.length > 0 && radarGroups.length > 0)

  if (section.items.length === 0) {
    return <p className="text-[10px] store-text-muted italic">None</p>
  }

  if (groupRadars && radarItems.length > 0) {
    return (
      <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
        {radarGroups.map((group, index) => (
          <IadsStackBlock
            key={group.stackKey}
            stackKey={group.stackKey}
            stackLabel={group.stackLabel}
            items={group.items}
            finishChainSummary={group.finishChainSummary}
            tone={section.tone}
            defaultOpen={section.tone === 'can' ? true : index < 4}
            selectedItem={selectedItem}
              onItemClick={onItemClick}
          />
        ))}
        {otherItems.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-[var(--store-line)]">
            {otherItems.map((item) => (
              <EvalRow
                key={`${item.kind}-${item.assetId}`}
                item={item}
                tone={section.tone}
                selectedItem={selectedItem}
              onItemClick={onItemClick}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
      {section.items.map((item) => (
        <EvalRow key={`${item.kind}-${item.assetId}`} item={item} tone={section.tone} selectedItem={selectedItem}
              onItemClick={onItemClick} />
      ))}
    </div>
  )
}

function ScoreTile({
  label,
  value,
  hint,
  active,
  tone,
  onClick,
}: {
  label: string
  value: number
  hint: string
  active: boolean
  tone: 'can' | 'cannot' | 'neutral'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 min-w-0 rounded-lg border px-2 py-2 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--store-accent-border)]',
        active
          ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)]'
          : 'border-[var(--store-line)] hover:bg-[var(--store-surface-2)]',
      )}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wider store-text-muted">{label}</p>
      <p
        className={cn(
          'text-lg font-mono leading-none mt-1',
          tone === 'can' ? 'text-green-400' : tone === 'cannot' ? 'store-text-muted' : 'text-white',
        )}
      >
        {value}
      </p>
      <p className="text-[9px] store-text-muted mt-1 leading-tight">{hint}</p>
    </button>
  )
}

function PreviewList({
  section,
  selectedItem,
  onItemClick,
  expanded,
  onToggle,
}: {
  section: EvaluationSection
  selectedItem: SelectedLaydownItem | null
  onItemClick: (item: EvaluatedItem) => void
  expanded: boolean
  onToggle: () => void
}) {
  const preview: EvaluationSection = expanded
    ? section
    : { ...section, items: section.items.slice(0, PREVIEW_LIMIT) }
  const hidden = Math.max(0, section.items.length - PREVIEW_LIMIT)

  return (
    <div>
      <SectionItemList section={preview} selectedItem={selectedItem} onItemClick={onItemClick} />
      {hidden > 0 && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-2 w-full text-[10px] font-mono store-text-muted hover:text-white border border-[var(--store-line)] rounded-lg py-1.5"
        >
          {expanded ? 'Show decision set only' : `Show remaining ${hidden} systems`}
        </button>
      )}
    </div>
  )
}

export function LaydownEvaluationPanel({
  evaluation,
  placedItems,
  selectedItem,
  onSelectItem,
  onEvalItemClick,
  adjudicationSource,
  compareRows = [],
}: LaydownEvaluationPanelProps) {
  const board = useMemo(() => (evaluation ? commanderScoreboard(evaluation) : null), [evaluation])
  const [tab, setTab] = useState<ScoreboardTab>('defeat')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!board) return
    if (board.verdict === 'can_finish' && board.defeatSection) setTab('defeat')
    else if (board.detectSection) setTab('detect')
    else if (board.defeatSection) setTab('defeat')
    else setTab('gaps')
    setExpanded(false)
  }, [evaluation?.subject.instanceId, board?.verdict, board?.detectSection, board?.defeatSection])

  if (!evaluation || !board) return null

  const Icon = kindIcon(evaluation.subject.kind)
  const gapCount = board.detectBlind + board.noShot
  const activeSection =
    tab === 'detect'
      ? board.detectSection
      : tab === 'defeat'
        ? board.defeatSection
        : null
  const gapSections = [board.detectBlindSection, board.noShotSection].filter(
    (section): section is EvaluationSection => section != null,
  )

  return (
    <StorePanel className="absolute top-14 right-3 z-20 w-[min(100%,24rem)] max-h-[calc(100%-4rem)] overflow-y-auto p-3 shadow-xl pointer-events-auto border-[var(--store-accent-border)]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--store-accent)] flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            Laydown evaluation
          </p>
          <p className="text-[9px] store-text-muted mt-0.5">
            Commander scoreboard · OSINT catalog · virtual geometry
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className="text-[9px] font-mono">
            {KIND_LABEL[evaluation.subject.kind]}
          </Badge>
          {adjudicationSource && adjudicationSource !== 'client' && (
            <Badge variant="assessed" className="text-[9px]">
              {adjudicationSource}
            </Badge>
          )}
        </div>
      </div>

      {placedItems.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {placedItems.map((chip) => {
            const item: SelectedLaydownItem = { kind: chip.kind, instanceId: chip.instanceId }
            const active = isSameLaydownItem(selectedItem, item)
            return (
              <button
                key={`${chip.kind}-${chip.instanceId}`}
                type="button"
                onClick={() => onSelectItem(item)}
                className={cn(
                  'px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-colors truncate max-w-full',
                  active
                    ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]'
                    : 'border-[var(--store-line)] store-text-muted hover:text-white',
                )}
              >
                {chip.name}
              </button>
            )
          })}
        </div>
      )}

      <p className="text-xs font-medium text-white mb-2 leading-snug">{evaluation.subject.name}</p>

      <div
        className={cn(
          'rounded-lg border px-2.5 py-2 mb-3',
          board.verdict === 'can_finish'
            ? 'border-green-500/40 bg-green-950/30'
            : board.verdict === 'detect_only'
              ? 'border-amber-400/40 bg-amber-950/20'
              : 'border-[var(--store-line)] bg-[var(--store-surface-1)]',
        )}
      >
        <p
          className={cn(
            'text-[10px] font-semibold uppercase tracking-wider',
            board.verdict === 'can_finish'
              ? 'text-green-400'
              : board.verdict === 'detect_only'
                ? 'text-amber-300'
                : 'store-text-muted',
          )}
        >
          {VERDICT_LABEL[board.verdict]}
        </p>
        <p className="text-[11px] text-white mt-1 leading-snug">{board.verdictLine}</p>
        <p className="text-[9px] store-text-muted mt-1">
          Pk figures are OSINT / training estimates — not accredited Pk.
        </p>
      </div>

      <div className="flex gap-1.5 mb-3">
        {board.detectSection && (
          <ScoreTile
            label="Detect"
            value={board.detect}
            hint="Can find"
            active={tab === 'detect'}
            tone={board.detect > 0 ? 'can' : 'cannot'}
            onClick={() => {
              setTab('detect')
              setExpanded(false)
            }}
          />
        )}
        {board.defeatSection && (
          <ScoreTile
            label="Defeat"
            value={board.defeat}
            hint="Can finish"
            active={tab === 'defeat'}
            tone={board.defeat > 0 ? 'can' : 'cannot'}
            onClick={() => {
              setTab('defeat')
              setExpanded(false)
            }}
          />
        )}
        {gapSections.length > 0 && (
          <ScoreTile
            label="Gaps"
            value={gapCount}
            hint="No shot"
            active={tab === 'gaps'}
            tone="cannot"
            onClick={() => {
              setTab('gaps')
              setExpanded(false)
            }}
          />
        )}
      </div>

      {compareRows.length > 1 && (
        <div className="mb-3 rounded-lg border border-[var(--store-line)] overflow-hidden">
          <p className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider store-text-muted">
            Airframe compare
          </p>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-2.5 pb-1 text-[9px] font-mono store-text-muted">
            <span />
            <span>Detect</span>
            <span>Defeat</span>
            <span>Call</span>
          </div>
          {compareRows.map((row) => {
            const active = selectedItem?.kind === 'uas' && selectedItem.instanceId === row.instanceId
            return (
              <button
                key={row.instanceId}
                type="button"
                onClick={() => onSelectItem({ kind: 'uas', instanceId: row.instanceId })}
                className={cn(
                  'w-full grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-2.5 py-1.5 text-left text-[10px] font-mono border-t border-[var(--store-line)]',
                  active
                    ? 'bg-[var(--store-accent-glow)] text-[var(--store-accent)]'
                    : 'hover:bg-[var(--store-surface-2)] text-white',
                )}
              >
                <span className="truncate">{row.name}</span>
                <span className={row.detect > 0 ? 'text-green-400' : 'store-text-muted'}>{row.detect}</span>
                <span className={row.defeat > 0 ? 'text-green-400' : 'store-text-muted'}>{row.defeat}</span>
                <span
                  className={
                    row.verdict === 'can_finish'
                      ? 'text-green-400'
                      : row.verdict === 'detect_only'
                        ? 'text-amber-300'
                        : 'store-text-muted'
                  }
                >
                  {row.verdict === 'can_finish' ? 'Finish' : row.verdict === 'detect_only' ? 'Find' : 'Blind'}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {tab !== 'gaps' && activeSection && (
        <div>
          <p
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wider mb-2',
              activeSection.tone === 'can' ? 'text-green-400' : 'store-text-muted',
            )}
          >
            {tab === 'detect' ? 'Can detect' : 'Can shoot down'}
            <span className="ml-1.5 font-mono font-normal normal-case">({activeSection.items.length})</span>
          </p>
          <PreviewList
            section={activeSection}
            selectedItem={selectedItem}
            onItemClick={onEvalItemClick}
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
          />
        </div>
      )}

      {tab === 'gaps' && (
        <div className="space-y-3">
          <p className="text-[10px] store-text-muted leading-snug">
            Catalog leftovers — systems that neither find nor finish this airframe. Do not use this list to make the
            call.
          </p>
          {gapSections.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 store-text-muted">
                {section.title}
                <span className="ml-1.5 font-mono font-normal normal-case">({section.items.length})</span>
              </p>
              <PreviewList
                section={section}
                selectedItem={selectedItem}
                onItemClick={onEvalItemClick}
                expanded={expanded}
                onToggle={() => setExpanded((v) => !v)}
              />
            </div>
          ))}
        </div>
      )}
    </StorePanel>
  )
}
