import Link from 'next/link'
import { PCM_EYEBROW } from '@/lib/pcm/presentation-copy'
import { SHOWCASE_EXERCISE_ID, SHOWCASE_EXERCISE_SUBTITLE } from '@/lib/pcm/showcase-exercise'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { ArrowUpRight, BarChart3, Crosshair, Swords } from 'lucide-react'

const MODULES = [
  {
    href: '/pcm/scenario',
    icon: Crosshair,
    title: 'Scenario Generator',
    body: 'Build a DS or RPIC scenario from a learner’s competency blind spots, with timed injects and instructor focus points.',
  },
  {
    href: '/pcm/force-design',
    icon: BarChart3,
    title: 'Force Design',
    body: 'Run competing force structures through repeated adaptive engagements and compare how often each succeeds.',
  },
  {
    href: '/arena',
    icon: Swords,
    title: 'WOPR Arena',
    body: 'Live Red and Blue scenario engine with streamed turns, fog of war and a replayable common operating picture.',
  },
] as const

export default function PcmHubPage() {
  return (
    <HubPageShell
      eyebrow="Wargaming"
      title={PCM_EYEBROW}
      subtitle="Learner-driven scenarios, a live globe, structured after action review and force-design analysis."
      headerAction={<p className="text-[11px] font-mono store-text-muted">Date of information: Jul 2026</p>}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ href, icon: Icon, title, body }) => (
            <Link
              key={href}
              href={href}
              className="group store-panel relative flex flex-col rounded-2xl p-5 transition-[border-color] duration-150 ease-out hover:border-[rgba(41,151,255,0.45)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--lacquer-line)] bg-white/[0.04]">
                  <Icon className="h-[18px] w-[18px] text-[var(--wb-blue)]" aria-hidden />
                </span>
                <ArrowUpRight
                  className="h-4 w-4 store-text-muted transition-colors duration-150 group-hover:text-[var(--store-ink)]"
                  aria-hidden
                />
              </div>
              <h2 className="store-display mt-4 text-[16px] font-semibold text-[var(--store-ink)]">{title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed store-text-body">{body}</p>
            </Link>
          ))}
        </div>

        <section className="store-panel rounded-2xl p-5" aria-labelledby="pcm-showcase">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="pcm-showcase" className="text-[15px] font-semibold text-[var(--store-ink)]">
                  Showcase exercise
                </h2>
                <span className="tag green">Active</span>
                <span className="font-mono text-[12px] store-text-muted">{SHOWCASE_EXERCISE_ID}</span>
              </div>
              <p className="mt-1.5 text-[13px] store-text-body">{SHOWCASE_EXERCISE_SUBTITLE}</p>
              <p className="mt-1 text-[12px] store-text-muted">
                New exercises start from Scenario Generator and open on the live globe once published.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link href={`/pcm/exercise/${SHOWCASE_EXERCISE_ID}/aar`} className="fc-action !px-2">
                After action review
              </Link>
              <Link href={`/pcm/exercise/${SHOWCASE_EXERCISE_ID}`} className="btn-glass">
                Open exercise
              </Link>
              <Link href="/pcm/scenario" className="btn-glass primary">
                New exercise
              </Link>
            </div>
          </div>
        </section>
      </div>
    </HubPageShell>
  )
}
