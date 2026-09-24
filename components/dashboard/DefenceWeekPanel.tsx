import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { StorePanel } from '@/components/ui/store-surface'
import { topicById, type ReportingItem } from '@/lib/intel/reporting'
import { WATCHFLOOR_NAME } from '@/lib/intel/watchfloor'

interface Props {
  items: ReportingItem[]
  generatedAt: string | null
}

const STREAM_LABEL: Record<ReportingItem['stream'], string> = {
  official: 'Official',
  news: 'News',
  analysis: 'Analysis',
  advisories: 'Advisory',
}

/**
 * The opening line of a demo: what Defence and industry announced this week,
 * and where SPECTRAL already answers it. Australian items from the last seven
 * days, programme news first (official and specialist press over general).
 */
export function DefenceWeekPanel({ items, generatedAt }: Props) {
  const weekAgo = Date.now() - 7 * 86_400_000
  // Pick the eight most relevant to what SPECTRAL does, then show them newest first.
  const TOPIC_RANK = ['cuas', 'drones', 'ew', 'iamd', 'exercises', 'strike', 'wargaming', 'maritime', 'trust', 'acquisition', 'region']
  const relevance = (i: ReportingItem) => Math.min(...i.topics.map((t) => (TOPIC_RANK.indexOf(t) + 1 || 99)))
  const streamRank = (i: ReportingItem) => (i.stream === 'official' ? 0 : i.stream === 'news' ? 1 : 2)
  const week = items
    .filter((i) => i.australian && Date.parse(i.publishedAt) >= weekAgo && i.topics.length > 0)
    .sort((a, b) => relevance(a) - relevance(b) || streamRank(a) - streamRank(b) || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 8)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  return (
    <StorePanel className="p-5 mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="wb-pane-title !text-[15px]">This week in Defence</h2>
          <p className="text-[12.5px] store-text-muted mt-0.5">
            Australian defence announcements and reporting, and the module that answers each one.
          </p>
        </div>
        <Link href="/conflict?view=reporting" className="text-[13px] text-[var(--wb-blue)] hover:underline underline-offset-2">
          All reporting on the {WATCHFLOOR_NAME}
        </Link>
      </div>

      {week.length === 0 ? (
        <p className="py-6 text-center text-[13px] store-text-muted">
          No reporting collected in the last seven days. The {WATCHFLOOR_NAME} refreshes daily on a connected machine.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--store-line)]">
          {week.map((item) => {
            const topic = topicById(item.topics[0])
            return (
              <li key={item.id} className="grid grid-cols-[56px_1fr] lg:grid-cols-[56px_1fr_200px] gap-x-4 gap-y-1 py-2.5">
                <span className="font-mono text-[12px] store-text-muted pt-0.5">
                  {new Date(item.publishedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
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
                  <p className="mt-0.5 text-[12px] store-text-muted">
                    {STREAM_LABEL[item.stream]} · {item.outlet}
                  </p>
                </div>
                {topic ? (
                  <Link
                    href={topic.module.href}
                    className="col-start-2 lg:col-start-3 self-start text-[12.5px] text-[var(--wb-blue)] hover:underline underline-offset-2"
                  >
                    {topic.label}: {topic.module.label}
                  </Link>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      {generatedAt ? (
        <p className="mt-3 text-[11.5px] store-text-muted">
          Collected <span className="font-mono">{generatedAt.slice(0, 16).replace('T', ' ')}</span> UTC. Headlines link to the publisher.
        </p>
      ) : null}
    </StorePanel>
  )
}
