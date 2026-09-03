'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AcquisitionBrief } from '@/lib/acquire/acquire-types'
import { Copy, Download } from 'lucide-react'
import { StorePanel } from '@/components/ui/store-surface'

interface BriefPanelProps {
  brief: AcquisitionBrief
}

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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyMarkdown()}
          aria-live="polite"
          className="store-btn-primary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          {copied ? 'Copied' : 'Copy markdown'}
        </button>
        <button
          type="button"
          onClick={downloadMarkdown}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--store-line)] px-3 py-1.5 text-xs font-medium store-text-body hover:text-white"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Download .md
        </button>
      </div>

      <StorePanel className="p-4">
        <h3 className="text-xs font-mono uppercase tracking-widest store-text-muted mb-3">
          Structured summary
        </h3>
        <div className="space-y-3">
          {brief.structured.options.map((opt) => (
            <div
              key={opt.rank}
              className="flex flex-wrap items-center gap-2 text-xs border-b border-[var(--store-line)] pb-2 last:border-0"
            >
              <span className="font-mono text-cyan">#{opt.rank}</span>
              <span className="text-white font-medium">{opt.system}</span>
              <span className="font-mono tabular-nums store-text-body">
                ${opt.cost_per_kill_usd.toLocaleString('en-US')}/kill
              </span>
              <span className="text-[10px] font-mono store-panel-inner px-2 py-0.5 rounded border border-[var(--store-line)]">
                {opt.confidence}
              </span>
            </div>
          ))}
        </div>
      </StorePanel>

      <StorePanel className="p-4">
        <pre className="text-[11px] font-mono store-text-body whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto">
          {brief.markdown}
        </pre>
      </StorePanel>
    </div>
  )
}
