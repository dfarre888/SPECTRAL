'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { REPORTING_TOPICS, topicById, type ReportingItem, type ReportingStream } from '@/lib/intel/reporting'
import { cn } from '@/lib/utils'

const STREAMS: { id: 'all' | ReportingStream; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'official', label: 'Official' },
  { id: 'news', label: 'News' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'advisories', label: 'Advisories' },
]

const STREAM_TAG: Record<ReportingStream, string> = {
  official: 'blue',
  news: '',
  analysis: 'violet',
  advisories: 'amber',
}

const STREAM_LABEL: Record<ReportingStream, string> = {
  official: 'Official',
  news: 'News',
  analysis: 'Analysis',
  advisories: 'Advisory',
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

interface Props {
  items: ReportingItem[]
  generatedAt: string | null
  sources: string[]
  windowDays: number
}

/**
 * Watchfloor reporting view: every headline the collectors kept, filterable
 * by stream and topic, each pointing at the SPECTRAL module that answers it.
 */
export function WatchfloorReporting({ items, generatedAt, sources, windowDays }: Props) {
  const [stream, setStream] = useState<'all' | ReportingStream>('all')
  const [topic, setTopic] = useState<string | null>(null)
  const [australia, setAustralia] = useState(true)

  const streamCounts = useMemo(() => {
    const base = items.filter((i) => (!australia || i.australian) && (!topic || i.topics.includes(topic)))
    const c: Record<string, number> = { all: base.length }
    for (const i of base) c[i.stream] = (c[i.stream] ?? 0) + 1
    return c
  }, [items, australia, topic])

  const topicCounts = useMemo(() => {
    const base = items.filter((i) => (!australia || i.australian) && (stream === 'all' || i.stream === stream))
    const c = new Map<string, number>()
    for (const i of base) for (const t of i.topics) c.set(t, (c.get(t) ?? 0) + 1)
    return c
  }, [items, australia, stream])

  const visible = useMemo(
    () =>
      items.filter(
        (i) =>
          (!australia || i.australian) &&
          (stream === 'all' || i.stream === stream) &&
          (!topic || i.topics.includes(topic)),
      ),
    [items, australia, stream, topic],
  )

  if (items.length === 0) {
    return (
      <div className="store-panel rounded-2xl p-8 text-center">
        <p className="text-[15px] font-semibold text-[var(--store-ink)]">No reporting on this instance yet</p>
        <p className="mt-1.5 text-[13px] store-text-body">
          Run <code className="font-mono text-[var(--store-ink-soft)]">npm run watchfloor:reporting</code> on a connected machine, or wait for the daily refresh.
        </p>
      </div>
    )
  }

  return (
    <section aria-label="Reporting">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="seg" role="tablist" aria-label="Reporting stream">
          {STREAMS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={stream === s.id}
              onClick={() => setStream(s.id)}
            >
              {s.label}
              <span className="font-mono text-[11px] opacity-70">{streamCounts[s.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn-e sm"
          aria-pressed={australia}
          onClick={() => setAustralia((v) => !v)}
        >
          Australia and the ADF
        </button>
        <span className="ml-auto text-[12px] store-text-muted">
          {visible.length} of {items.length} headlines · last {windowDays} days
          {generatedAt ? <> · collected <span className="font-mono">{generatedAt.slice(0, 16).replace('T', ' ')}</span> UTC</> : null}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Filter by topic">
        <button type="button" className="btn-e xs" aria-pressed={topic === null} onClick={() => setTopic(null)}>
          All topics
        </button>
        {REPORTING_TOPICS.filter((t) => (topicCounts.get(t.id) ?? 0) > 0).map((t) => (
          <button
            key={t.id}
            type="button"
            className="btn-e xs"
            aria-pressed={topic === t.id}
            onClick={() => setTopic(topic === t.id ? null : t.id)}
          >
            {t.label}
            <span className="font-mono opacity-70">{topicCounts.get(t.id)}</span>
          </button>
        ))}
      </div>

      <ScrollArea maxHeight="calc(100vh - 300px)">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-[13px] store-text-muted">Nothing in this stream for these filters.</p>
        ) : (
          <ul className="divide-y divide-[var(--store-line)]">
            {visible.map((item) => {
              const primary = topicById(item.topics[0])
              return (
                <li key={item.id} className="grid grid-cols-[64px_1fr] md:grid-cols-[64px_1fr_190px] gap-x-4 gap-y-1.5 px-4 py-3 hover:bg-[rgba(255,255,255,0.03)]">
                  <span className="font-mono text-[12px] store-text-muted pt-0.5">{dayLabel(item.publishedAt)}</span>
                  <div className="min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-start gap-1 text-[13.5px] leading-snug text-[var(--store-ink)] hover:text-white"
                    >
                      <span className="group-hover:underline underline-offset-2">{item.title}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 mt-0.5 shrink-0 store-text-muted" aria-hidden />
                    </a>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={cn('tag', STREAM_TAG[item.stream])}>{STREAM_LABEL[item.stream]}</span>
                      <span className="text-[12px] store-text-muted">{item.outlet}</span>
                      {item.topics.slice(0, 3).map((t) => (
                        <span key={t} className="tag !h-[20px]">{topicById(t)?.label ?? t}</span>
                      ))}
                    </div>
                  </div>
                  {primary ? (
                    <Link
                      href={primary.module.href}
                      className="col-start-2 md:col-start-3 self-start text-[12.5px] text-[var(--wb-blue)] hover:underline underline-offset-2"
                    >
                      Covered in {primary.module.label}
                    </Link>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>

      <p className="mt-3 text-[12px] store-text-muted max-w-[110ch]">
        Headlines and links only; articles stay with their publishers. Collected from {sources.length} sources: {sources.join(', ')}.
      </p>
    </section>
  )
}
