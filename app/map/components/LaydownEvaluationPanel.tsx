'use client'

import { Badge } from '@/components/ui/badge'
import { StorePanel } from '@/components/ui/store-surface'
import type {
  EvaluatedItem,
  LaydownEvaluation,
  SelectedLaydownItem,
} from '@/lib/map/laydown-evaluation'
import { isSameLaydownItem } from '@/lib/map/laydown-evaluation'
import { cn } from '@/lib/utils'
import { Crosshair, Radar, Shield, Target } from 'lucide-react'

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
  onAddCatalogItem: (item: EvaluatedItem) => void
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
  onAdd,
}: {
  item: EvaluatedItem
  tone: 'can' | 'cannot'
  onAdd: (item: EvaluatedItem) => void
}) {
  return (
    <button
      type="button"
      title="Click globe to place"
      onClick={() => onAdd(item)}
      className={cn(
        'store-panel-inner rounded-lg px-2.5 py-2 w-full text-left cursor-pointer transition-colors',
        'hover:bg-[var(--store-surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--store-accent-border)]',
        tone === 'can' ? 'border-l-2 border-green-500/60' : 'opacity-80',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-xs font-mono truncate', tone === 'can' ? 'text-white' : 'store-text-muted')}>
          {item.name}
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
      <p className="text-[9px] store-text-muted mt-0.5 leading-relaxed">{item.reason}</p>
    </button>
  )
}

export function LaydownEvaluationPanel({
  evaluation,
  placedItems,
  selectedItem,
  onSelectItem,
  onAddCatalogItem,
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
            {section.items.length === 0 ? (
              <p className="text-[10px] store-text-muted italic">None</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                {section.items.map((item) => (
                  <EvalRow
                    key={`${item.kind}-${item.assetId}`}
                    item={item}
                    tone={section.tone}
                    onAdd={onAddCatalogItem}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </StorePanel>
  )
}
