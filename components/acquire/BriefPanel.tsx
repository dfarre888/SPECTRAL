'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AcquisitionBrief } from '@/lib/acquire/acquire-types'
import { Check, Copy, Download } from 'lucide-react'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { StorePanel } from '@/components/ui/store-surface'
import { ScrollArea } from '@/components/ui/ScrollArea'

interface BriefPanelProps {
  brief: AcquisitionBrief
}

type BriefOption = AcquisitionBrief['structured']['options'][number]

const CONFIDENCE_TAG: Record<string, string> = {
  Confirmed: 'tag green',
  Assessed: 'tag amber',
  Estimated: 'tag',
  Reported: 'tag violet',
  Suspected: 'tag',
}

const COLUMNS: DataColumn<BriefOption>[] = [
  {
    key: 'rank',
    header: 'Rank',
    align: 'right',
    headerClassName: '!text-right',
    width: 76,
    sortValue: (o) => o.rank,
    cell: (o) => <span className="store-text-muted">{o.rank}</span>,
  },
  {
    key: 'system',
    header: 'System',
    width: 300,
    sortValue: (o) => o.system,
    cell: (o) => <span className="primary">{o.system}</span>,
  },
  {
    key: 'cpk',
    header: 'Cost per kill',
    align: 'right',
    headerClassName: '!text-right',
    width: 150,
    sortValue: (o) => o.cost_per_kill_usd,
    cell: (o) => `$${o.cost_per_kill_usd.toLocaleString('en-US')}`,
  },
  {
    key: 'conf',
    header: 'Cost confidence',
    width: 150,
    sortValue: (o) => o.confidence,
    cell: (o) => <span className={CONFIDENCE_TAG[o.confidence] ?? 'tag'}>{o.confidence}</span>,
  },
  {
    key: 'source',
    header: 'Source',
    cell: (o) => (
      <span className="block min-w-[240px] font-mono text-xs leading-snug store-text-body">
        {o.source_ref}
      </span>
    ),
  },
]

export function BriefPanel({ brief }: BriefPanelProps) {
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(brief.markdown)
      setCopied(true)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [brief.markdown])

  const downloadMarkdown = useCallback(() => {
    const blob = new Blob([brief.markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'acquisition-brief.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [brief.markdown])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="store-display text-[17px] font-semibold tracking-[-0.01em] text-[var(--store-ink)]">
            {brief.structured.title}
          </h2>
          <p className="mt-1 text-[13px] store-text-body">
            {brief.structured.threat} at {brief.structured.location}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyMarkdown()}
            aria-live="polite"
            className="btn-glass primary"
          >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied ? 'Copied' : 'Copy markdown'}
          </button>
          <button type="button" onClick={downloadMarkdown} className="btn-glass">
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download .md
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-[15px] font-semibold text-[var(--store-ink)]">Structured summary</h3>
        <DataTable
          rows={brief.structured.options}
          columns={COLUMNS}
          rowKey={(o) => String(o.rank)}
          caption="Ranked acquisition options"
          maxHeight="none"
        />
      </div>

      <div>
        <h3 className="mb-3 text-[15px] font-semibold text-[var(--store-ink)]">Brief as markdown</h3>
        <StorePanel className="overflow-hidden p-0">
          <ScrollArea frame={false} maxHeight="min(560px, calc(100vh - 240px))">
            <pre className="whitespace-pre-wrap px-5 py-4 font-mono text-[12.5px] leading-relaxed store-text-body">
              {brief.markdown}
            </pre>
          </ScrollArea>
        </StorePanel>
      </div>
    </div>
  )
}
