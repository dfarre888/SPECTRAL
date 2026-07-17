'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { StorePanel } from '@/components/ui/store-surface'
import type {
  EvaluatedItem,
  EvaluationSection,
  LaydownEvaluation,
  SelectedLaydownItem,
} from '@/lib/map/laydown-evaluation'
import { groupEvaluatedByIadsStack, isSameLaydownItem } from '@/lib/map/laydown-evaluation'
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

export function LaydownEvaluationPanel({
  evaluation,
  placedItems,
  selectedItem,
  onSelectItem,
  onEvalItemClick,
  adjudicationSource,
}: LaydownEvaluationPanelProps) {
  if (!evaluation) return null

  const Icon = kindIcon(evaluation.subject.kind)

  return (
    <StorePanel className="absolute top-14 right-3 z-20 w-[min(100%,22rem)] max-h-[calc(100%-4rem)] overflow-y-auto p-3 shadow-xl pointer-events-auto border-[var(--store-accent-border)]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--store-accent)] flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            Laydown evaluation
          </p>
          <p className="text-[9px] store-text-muted mt-0.5">OSINT catalog · virtual geometry at selected item</p>
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

      <p className="text-xs font-medium text-white mb-3 leading-snug">{evaluation.subject.name}</p>

      <div className="space-y-4">
        {evaluation.sections.map((section) => (
          <div key={section.title}>
            <p
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wider mb-2',
                section.tone === 'can' ? 'text-green-400' : 'store-text-muted',
              )}
            >
              {section.title}
              <span className="ml-1.5 font-mono font-normal normal-case">({section.items.length})</span>
            </p>
            <SectionItemList section={section} selectedItem={selectedItem} onItemClick={onEvalItemClick} />
          </div>
        ))}
      </div>
    </StorePanel>
  )
}
