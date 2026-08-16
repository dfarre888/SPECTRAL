'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type {
  CommanderCompareRow,
  EvaluatedItem,
  EvaluationSection,
  LaydownEvaluation,
  SelectedLaydownItem,
} from '@/lib/map/laydown-evaluation'
import { formatCatalogDisplayName } from '@/lib/map/catalog-display-name'
import { finishClassLabel, finishPctLabel } from '@/lib/map/finish-class'
import {
  commanderScoreboard,
  groupEvaluatedByIadsStack,
  isSameLaydownItem,
} from '@/lib/map/laydown-evaluation'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

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

type ScoreboardTab = 'detect' | 'deny' | 'destroy' | 'gaps'

const PREVIEW_LIMIT = 8

const VERDICT_LABEL: Record<'can_finish' | 'deny_only' | 'detect_only' | 'blind', string> = {
  can_finish: 'Find and destroy',
  deny_only: 'Find and deny — airframe stays up',
  detect_only: 'Detect only',
  blind: 'Blind',
}

const KIND_LABEL: Record<SelectedLaydownItem['kind'], string> = {
  uas: 'UAS',
  cuas: 'C-UAS',
  radar: 'Radar',
  effector: 'Effector',
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
  const displayName = formatCatalogDisplayName({
    name: item.name,
    natoName: item.natoName,
    parentSystem: compactStack ? null : item.parentSystem,
  })

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
        'map-press store-panel-inner rounded-lg px-2.5 py-2 w-full text-left cursor-pointer border',
        'hover:bg-[var(--store-surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--store-accent-border)]',
        selected
          ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)]'
          : 'border-transparent',
        item.finishClass === 'deny' && tone === 'can'
          ? 'border-l-2 border-l-amber-400/70'
          : tone === 'can'
            ? 'border-l-2 border-l-green-500/60'
            : 'opacity-80',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-xs font-mono truncate', tone === 'can' ? 'text-white' : 'store-text-muted')}>
          {displayName}
          {item.placed && (
            <span className="ml-1.5 text-[9px] uppercase text-[var(--store-accent)]">on map</span>
          )}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.finishClass && (
            <span
              className={cn(
                'text-[8px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded',
                item.finishClass === 'destroy'
                  ? 'bg-green-950/60 text-green-400 border border-green-500/30'
                  : 'bg-amber-950/50 text-amber-300 border border-amber-400/30',
              )}
            >
              {finishClassLabel(item.finishClass)}
            </span>
          )}
          {item.pct != null && (
            <span
              className={cn(
                'text-[11px] font-mono',
                item.finishClass === 'deny'
                  ? 'text-amber-300'
                  : tone === 'can'
                    ? 'text-green-400'
                    : 'store-text-muted',
              )}
            >
              {item.pct}%
              {item.finishClass ? (
                <span className="block text-[8px] leading-none store-text-muted text-right">
                  {finishPctLabel(item.finishClass)}
                </span>
              ) : null}
            </span>
          )}
        </div>
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

function ScoreMetric({
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
  tone: 'can' | 'cannot' | 'neutral' | 'deny'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      aria-pressed={active}
      className="map-press map-spec-metric focus-visible:outline-none"
    >
      <p
        className={cn(
          'text-[10px] font-medium tracking-[0.08em] uppercase',
          active ? 'text-[var(--store-ink)]' : 'store-text-muted',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'map-spec-value',
          tone === 'can'
            ? 'text-green-400'
            : tone === 'deny'
              ? 'text-amber-300'
              : tone === 'cannot'
                ? 'store-text-muted'
                : 'text-white',
        )}
      >
        {value}
      </p>
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
  const [tab, setTab] = useState<ScoreboardTab>('destroy')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!board) return
    if (board.destroy > 0) setTab('destroy')
    else if (board.deny > 0) setTab('deny')
    else if (board.detectSection) setTab('detect')
    else setTab('gaps')
    setExpanded(false)
  }, [evaluation?.subject.instanceId, board?.verdict, board?.destroy, board?.deny, board?.detectSection])

  if (!evaluation || !board) return null

  const gapCount = board.detectBlind + board.noShot
  const activeSection =
    tab === 'detect'
      ? board.detectSection
      : tab === 'deny'
        ? board.denySection
        : tab === 'destroy'
          ? board.destroySection
          : null
  const gapSections = [board.detectBlindSection, board.noShotSection].filter(
    (section): section is EvaluationSection => section != null,
  )

  return (
    <div className="map-material-float absolute top-8 right-4 z-20 w-[min(100%,22rem)] max-h-[calc(100%-5rem)] overflow-y-auto px-5 py-5 pointer-events-auto">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-white leading-none">
            {evaluation.subject.name}
          </p>
          <p className="text-[11px] store-text-muted mt-1.5">
            {KIND_LABEL[evaluation.subject.kind]} · OSINT catalog
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {adjudicationSource && adjudicationSource !== 'client' && (
            <Badge variant="assessed" className="text-[9px]">
              {adjudicationSource}
            </Badge>
          )}
        </div>
      </div>

      {placedItems.length > 1 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-5">
          {placedItems.map((chip) => {
            const item: SelectedLaydownItem = { kind: chip.kind, instanceId: chip.instanceId }
            const active = isSameLaydownItem(selectedItem, item)
            return (
              <button
                key={`${chip.kind}-${chip.instanceId}`}
                type="button"
                onClick={() => onSelectItem(item)}
                aria-pressed={active}
                className="map-press map-chip truncate max-w-full"
              >
                {chip.name}
              </button>
            )
          })}
        </div>
      )}

      <p
        className={cn(
          'text-[13px] font-medium leading-snug',
          board.verdict === 'can_finish'
            ? 'text-green-400'
            : board.verdict === 'deny_only' || board.verdict === 'detect_only'
              ? 'text-amber-300'
              : 'store-text-muted',
        )}
      >
        {VERDICT_LABEL[board.verdict]}
      </p>
      <p className="text-[12px] store-text-body mt-1.5 leading-relaxed">{board.verdictLine}</p>
      <p className="text-[11px] store-text-muted mt-2 leading-relaxed">
        P(kill) = airframe down. P(link) = pilot denied, airframe recoverable. Training estimates, not accredited Pk.
      </p>

      {board.williamtownLine && (
        <p className="text-[12px] text-amber-300 mt-3 leading-relaxed">{board.williamtownLine}</p>
      )}

      <div className="map-spec mt-6 mb-5">
        {board.detectSection && (
          <ScoreMetric
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
        {(board.defeatSection || board.denySection) && (
          <ScoreMetric
            label="Deny"
            value={board.deny}
            hint="Link only · stays up"
            active={tab === 'deny'}
            tone={board.deny > 0 ? 'deny' : 'cannot'}
            onClick={() => {
              setTab('deny')
              setExpanded(false)
            }}
          />
        )}
        {(board.defeatSection || board.destroySection) && (
          <ScoreMetric
            label="Destroy"
            value={board.destroy}
            hint="Airframe down"
            active={tab === 'destroy'}
            tone={board.destroy > 0 ? 'can' : 'cannot'}
            onClick={() => {
              setTab('destroy')
              setExpanded(false)
            }}
          />
        )}
        {gapSections.length > 0 && (
          <ScoreMetric
            label="Gaps"
            value={gapCount}
            hint="No find / no finish"
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
        <div className="mb-5">
          <p className="text-[10px] font-medium tracking-[0.08em] uppercase store-text-muted mb-2">
            Airframe compare
          </p>
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 pb-1 text-[10px] store-text-muted">
            <span />
            <span>Find</span>
            <span>Deny</span>
            <span>Kill</span>
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
                  'w-full grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 py-2 text-left text-[12px] font-mono border-t border-[var(--store-line)]',
                  active ? 'text-[var(--store-accent)]' : 'text-white',
                )}
              >
                <span className="truncate">{row.name}</span>
                <span className={row.detect > 0 ? 'text-green-400' : 'store-text-muted'}>{row.detect}</span>
                <span className={row.deny > 0 ? 'text-amber-300' : 'store-text-muted'}>{row.deny}</span>
                <span className={row.destroy > 0 ? 'text-green-400' : 'store-text-muted'}>{row.destroy}</span>
                <span
                  className={
                    row.verdict === 'can_finish'
                      ? 'text-green-400'
                      : row.verdict === 'deny_only' || row.verdict === 'detect_only'
                        ? 'text-amber-300'
                        : 'store-text-muted'
                  }
                >
                  {row.verdict === 'can_finish'
                    ? 'Kill'
                    : row.verdict === 'deny_only'
                      ? 'Deny'
                      : row.verdict === 'detect_only'
                        ? 'Find'
                        : 'Blind'}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {tab !== 'gaps' && !activeSection && (tab === 'deny' || tab === 'destroy') && (
        <p className="text-[11px] text-amber-200/90 leading-snug mb-2">
          {tab === 'deny'
            ? 'No catalog RF deny path for this airframe.'
            : 'No catalog hard-kill path. A DroneGun-class RF buy is not a crash — the airframe stays up.'}
        </p>
      )}

      {tab === 'deny' && activeSection && (
        <p className="text-[10px] text-amber-200/80 leading-snug mb-2">
          These systems take the pilot off the stick. They do not drop the aircraft.
        </p>
      )}

      {tab !== 'gaps' && activeSection && (
        <div>
          <p
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wider mb-2',
              activeSection.tone === 'can' ? 'text-green-400' : 'store-text-muted',
            )}
          >
            {tab === 'detect' ? 'Can detect' : tab === 'deny' ? 'Can deny — link only' : 'Can destroy — airframe down'}
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
    </div>
  )
}
