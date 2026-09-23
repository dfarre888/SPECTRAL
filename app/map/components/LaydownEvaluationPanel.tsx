'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { ChevronRight, Crosshair, Radar, Shield, Target } from 'lucide-react'
import { MapCard } from '@/app/map/components/MapUi'

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
  className?: string
}

type ScoreboardTab = 'detect' | 'deny' | 'destroy' | 'gaps'

const PREVIEW_LIMIT = 8

const VERDICT_LABEL: Record<'can_finish' | 'deny_only' | 'detect_only' | 'blind', string> = {
  can_finish: 'Find and destroy',
  deny_only: 'Find and deny (airframe stays up)',
  detect_only: 'Detect only',
  blind: 'Blind',
}

const KIND_LABEL: Record<SelectedLaydownItem['kind'], string> = {
  uas: 'UAS',
  cuas: 'C-UAS',
  radar: 'Radar',
  effector: 'Effector',
}

const GREEN = '#4ADE80'
const AMBER = '#FBBF24'

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
  /** When true, parent system is shown on the stack header, so the row omits it. */
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
  const pctColour =
    item.finishClass === 'deny' ? AMBER : tone === 'can' ? GREEN : 'var(--store-ink-mute)'

  return (
    <button
      type="button"
      title={`${displayName}. ${actionLabel}`}
      aria-pressed={selected}
      onClick={() => onItemClick(item)}
      className={cn(
        'map-press block w-full text-left rounded-xl px-3 py-2.5 transition-[background-color,box-shadow] duration-150 ease-out',
        selected
          ? 'bg-[rgba(41,151,255,0.14)] shadow-[inset_0_0_0_1px_rgba(41,151,255,0.55)]'
          : 'store-panel-inner hover:bg-[rgba(255,255,255,0.05)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              'text-[13px] font-medium leading-snug',
              tone === 'can' ? 'text-[var(--store-ink)]' : 'store-text-body',
            )}
          >
            {displayName}
          </p>
          {item.placed && <p className="mt-0.5 text-[11.5px] text-[#6CB8FF]">On map</p>}
        </div>
        <div className="flex items-start gap-2 shrink-0">
          {item.finishClass && (
            <span className={cn('tag', item.finishClass === 'destroy' ? 'green' : 'amber')}>
              {finishClassLabel(item.finishClass)}
            </span>
          )}
          {item.pct != null && (
            <span className="text-right leading-none">
              <span className="block font-mono text-[13px] tabular-nums" style={{ color: pctColour }}>
                {item.pct}%
              </span>
              {item.finishClass ? (
                <span className="block mt-1 font-mono text-[11px] store-text-muted">
                  {finishPctLabel(item.finishClass)}
                </span>
              ) : null}
            </span>
          )}
        </div>
      </div>
      {item.parentSystem && !compactStack && (
        <p className="text-[12px] font-mono text-[#67E8F9] mt-1">{item.parentSystem}</p>
      )}
      {item.roleLabel && item.kind === 'radar' && (
        <p className="text-[12px] store-text-muted mt-1 capitalize">{item.roleLabel} radar</p>
      )}
      {item.linkedEffectors && item.linkedEffectors.length > 0 && (
        <p className="text-[12px] store-text-muted mt-1 leading-relaxed">
          <span className="store-text-body">Finish chain: </span>
          {item.linkedEffectors.join(' · ')}
        </p>
      )}
      {item.linkedRadars && item.linkedRadars.length > 0 && (
        <p className="text-[12px] store-text-muted mt-1 leading-relaxed">
          <span className="store-text-body">Cueing radar: </span>
          {item.linkedRadars.join(' · ')}
        </p>
      )}
      <p className="text-[12px] store-text-muted mt-1 leading-relaxed">{item.reason}</p>
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
    <div className="rounded-xl border border-[var(--store-line)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-3 py-2 text-left flex items-start gap-2 rounded-xl transition-colors hover:bg-[rgba(255,255,255,0.05)]"
      >
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 shrink-0 mt-0.5 store-text-muted transition-transform duration-150 ease-out motion-reduce:transition-none',
            open && 'rotate-90',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[12px] font-mono font-semibold text-[#67E8F9]">{stackLabel}</p>
            <span className="text-[12px] font-mono store-text-muted shrink-0 tabular-nums">{items.length}</span>
          </div>
          {finishChainSummary && (
            <p className="text-[12px] store-text-muted mt-0.5 leading-relaxed">
              <span className="store-text-body">Finish chain: </span>
              {finishChainSummary}
            </p>
          )}
          {tone === 'cannot' && <span className="sr-only">Cannot engage</span>}
        </div>
      </button>
      {open && (
        <div className="space-y-1.5 p-1.5 pt-0">
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
    return <p className="text-[12px] store-text-muted">None</p>
  }

  if (groupRadars && radarItems.length > 0) {
    return (
      <div className="space-y-1.5">
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
          <div className="space-y-1.5 pt-1.5 border-t border-[var(--store-line)]">
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
    <div className="space-y-1.5">
      {section.items.map((item) => (
        <EvalRow
          key={`${item.kind}-${item.assetId}`}
          item={item}
          tone={section.tone}
          selectedItem={selectedItem}
          onItemClick={onItemClick}
        />
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
  tone: 'can' | 'cannot' | 'neutral' | 'deny'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'map-press min-w-0 rounded-xl px-3 py-2.5 text-left transition-[background-color,box-shadow] duration-150 ease-out',
        active
          ? 'bg-[rgba(41,151,255,0.16)] shadow-[inset_0_0_0_1px_rgba(41,151,255,0.6)]'
          : 'store-panel-inner hover:bg-[rgba(255,255,255,0.05)]',
      )}
    >
      <p className="text-[12px] font-medium store-text-body">{label}</p>
      <p
        className="font-mono text-[22px] leading-none mt-1.5 tabular-nums"
        style={{
          color:
            tone === 'can'
              ? GREEN
              : tone === 'deny'
                ? AMBER
                : tone === 'cannot'
                  ? 'var(--store-ink-mute)'
                  : 'var(--store-ink)',
        }}
      >
        {value}
      </p>
      <p className="text-[11.5px] store-text-muted mt-1.5 leading-tight">{hint}</p>
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
          aria-expanded={expanded}
          className="btn-glass w-full mt-2 !min-h-8 !text-[12px]"
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
  className,
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

  const Icon = kindIcon(evaluation.subject.kind)
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
  const verdictColour =
    board.verdict === 'can_finish'
      ? GREEN
      : board.verdict === 'deny_only' || board.verdict === 'detect_only'
        ? AMBER
        : 'var(--store-ink-soft)'
  const verdictLine =
    board.verdict === 'can_finish'
      ? 'rgba(74,222,128,0.35)'
      : board.verdict === 'deny_only' || board.verdict === 'detect_only'
        ? 'rgba(251,191,36,0.35)'
        : 'var(--store-line)'

  return (
    <MapCard
      className={className}
      title="Laydown evaluation"
      icon={<Icon className="w-4 h-4" />}
      meta={
        <>
          <span className="tag font-mono">{KIND_LABEL[evaluation.subject.kind]}</span>
          {adjudicationSource && adjudicationSource !== 'client' && (
            <span className="tag blue font-mono">{adjudicationSource}</span>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {placedItems.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Placed items">
            {placedItems.map((chip) => {
              const item: SelectedLaydownItem = { kind: chip.kind, instanceId: chip.instanceId }
              const active = isSameLaydownItem(selectedItem, item)
              return (
                <button
                  key={`${chip.kind}-${chip.instanceId}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectItem(item)}
                  title={chip.name}
                  className="btn-e xs max-w-full"
                >
                  <span className="truncate">{chip.name}</span>
                </button>
              )
            })}
          </div>
        )}

        <div>
          <p className="text-[15px] font-semibold text-[var(--store-ink)] leading-snug">{evaluation.subject.name}</p>
          <p className="text-[11.5px] store-text-muted mt-0.5">Commander scoreboard · OSINT catalogue · virtual geometry</p>
        </div>

        <div className="rounded-xl px-3 py-2.5" style={{ border: `1px solid ${verdictLine}`, background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[13px] font-semibold" style={{ color: verdictColour }}>
            {VERDICT_LABEL[board.verdict]}
          </p>
          <p className="text-[12px] text-[var(--store-ink)] mt-1 leading-snug">{board.verdictLine}</p>
          <p className="text-[11.5px] store-text-muted mt-1.5 leading-relaxed">
            P(kill) = airframe down. P(link) = pilot denied, airframe recoverable. OSINT and training estimates, not
            accredited Pk.
          </p>
        </div>

        {board.williamtownLine && (
          <div className="rounded-xl px-3 py-2.5 border border-[rgba(251,191,36,0.35)] bg-[rgba(255,255,255,0.03)]">
            <p className="text-[13px] font-semibold text-[#FBBF24]">Williamtown lesson</p>
            <p className="text-[12px] text-[var(--store-ink)] mt-1 leading-snug">{board.williamtownLine}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Scoreboard">
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
          {(board.defeatSection || board.denySection) && (
            <ScoreTile
              label="Deny"
              value={board.deny}
              hint="Link only, stays up"
              active={tab === 'deny'}
              tone={board.deny > 0 ? 'deny' : 'cannot'}
              onClick={() => {
                setTab('deny')
                setExpanded(false)
              }}
            />
          )}
          {(board.defeatSection || board.destroySection) && (
            <ScoreTile
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
            <ScoreTile
              label="Gaps"
              value={gapCount}
              hint="No find or no finish"
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
          <div className="rounded-xl border border-[var(--store-line)] overflow-hidden">
            <p className="px-3 pt-2 pb-1 text-[12px] font-semibold store-text-muted">Airframe compare</p>
            <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,2.75rem)] gap-x-1 px-3 pb-1.5 text-[12px] store-text-muted">
              <span>Airframe</span>
              <span className="text-right">Find</span>
              <span className="text-right">Deny</span>
              <span className="text-right">Kill</span>
              <span className="text-right">Call</span>
            </div>
            {compareRows.map((row) => {
              const active = selectedItem?.kind === 'uas' && selectedItem.instanceId === row.instanceId
              const callColour =
                row.verdict === 'can_finish'
                  ? GREEN
                  : row.verdict === 'deny_only' || row.verdict === 'detect_only'
                    ? AMBER
                    : 'var(--store-ink-mute)'
              return (
                <button
                  key={row.instanceId}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectItem({ kind: 'uas', instanceId: row.instanceId })}
                  className={cn(
                    'w-full grid grid-cols-[minmax(0,1fr)_repeat(4,2.75rem)] gap-x-1 px-3 py-1.5 text-left text-[12px] border-t border-[var(--store-line)] transition-colors',
                    active ? 'bg-[rgba(41,151,255,0.14)]' : 'hover:bg-[rgba(255,255,255,0.05)]',
                  )}
                >
                  <span className="truncate text-[var(--store-ink)]" title={row.name}>
                    {row.name}
                  </span>
                  <span className="text-right font-mono tabular-nums" style={{ color: row.detect > 0 ? GREEN : 'var(--store-ink-mute)' }}>
                    {row.detect}
                  </span>
                  <span className="text-right font-mono tabular-nums" style={{ color: row.deny > 0 ? AMBER : 'var(--store-ink-mute)' }}>
                    {row.deny}
                  </span>
                  <span className="text-right font-mono tabular-nums" style={{ color: row.destroy > 0 ? GREEN : 'var(--store-ink-mute)' }}>
                    {row.destroy}
                  </span>
                  <span className="text-right font-mono" style={{ color: callColour }}>
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
          <p className="text-[12px] text-[#FCD34D] leading-snug">
            {tab === 'deny'
              ? 'No catalogue RF deny path for this airframe.'
              : 'No catalogue hard-kill path. A DroneGun-class RF buy is not a crash: the airframe stays up.'}
          </p>
        )}

        {tab === 'deny' && activeSection && (
          <p className="text-[12px] text-[#FCD34D] leading-snug">
            These systems take the pilot off the stick. They do not drop the aircraft.
          </p>
        )}

        {tab !== 'gaps' && activeSection && (
          <div>
            <p className="text-[12px] font-semibold mb-2 flex items-baseline gap-1.5" style={{ color: activeSection.tone === 'can' ? GREEN : 'var(--store-ink-mute)' }}>
              {tab === 'detect' ? 'Can detect' : tab === 'deny' ? 'Can deny (link only)' : 'Can destroy (airframe down)'}
              <span className="font-mono font-normal store-text-muted">{activeSection.items.length}</span>
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
            <p className="text-[12px] store-text-muted leading-snug">
              Catalogue leftovers: systems that neither find nor finish this airframe. Do not use this list to make
              the call.
            </p>
            {gapSections.map((section) => (
              <div key={section.title}>
                <p className="text-[12px] font-semibold mb-2 store-text-muted flex items-baseline gap-1.5">
                  {section.title}
                  <span className="font-mono font-normal">{section.items.length}</span>
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
    </MapCard>
  )
}
