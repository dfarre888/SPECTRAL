import Link from 'next/link'
import { ArrowUpRight, Flag } from 'lucide-react'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'
import { FORCE_THEATRES } from '@/lib/force/theatres'
import { getAllNationForces } from '@/lib/force/queries'

const HEAD_TO_HEAD: [string, string][] = [
  ['AUS', 'CHN'],
  ['USA', 'CHN'],
  ['USA', 'PRK'],
  ['JPN', 'CHN'],
  ['AUS', 'RUS'],
]

export default async function ForceIndexPage() {
  const forces = await getAllNationForces()
  const catalog = forces.reduce((n, f) => n + f.catalog_count, 0)

  return (
    <HubPageShell
      eyebrow="National force catalogue"
      eyebrowIcon={<Flag className="h-3.5 w-3.5" />}
      title="Force / ORBAT"
      subtitle="Air, land, and maritime types by nation. Compare effects, then send a package to the map. This is not a drone library: F-35 and Shahed stay in different catalogues."
    >
      <p className="mb-5 text-[12px] store-text-muted">
        Date of information <span className="font-mono">August 2026</span> ·{' '}
        <span className="font-mono tabular-nums">{catalog}</span> catalogue types ·{' '}
        <span className="font-mono tabular-nums">{forces.length}</span> nations · UNCLASSIFIED OSINT
      </p>

      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {forces.map((f) => {
          const red = f.nation.side === 'red'
          return (
            <Link
              key={f.nation.code}
              href={`/force/${f.nation.code.toLowerCase()}`}
              className="group rounded-2xl focus-visible:outline-offset-4"
            >
              <StorePanel className="flex h-full flex-col p-5 transition-[border-color,transform] duration-200 ease-out group-hover:border-[rgba(255,255,255,0.22)]">
                <div className="flex items-center gap-2.5">
                  <i
                    className="h-2 w-2 rounded-full"
                    style={{ background: red ? 'var(--wb-red)' : 'var(--wb-blue)' }}
                    aria-hidden
                  />
                  <p className="store-display text-[18px] font-semibold tracking-[-0.01em] text-[var(--store-ink)]">
                    {f.nation.shortName}
                  </p>
                  <span className="font-mono text-[12px] store-text-muted">{f.nation.code}</span>
                  <span className={`tag ml-auto ${red ? 'red' : 'blue'}`}>{red ? 'Red' : 'Blue'}</span>
                </div>
                <p className="mt-3 flex-1 text-[13px] leading-relaxed store-text-body">{f.nation.note}</p>
                <div className="mt-4 flex items-baseline gap-5 border-t border-[var(--store-line)] pt-3">
                  {f.domain.map((d) => (
                    <span key={d.domain} className="text-[12px] capitalize store-text-muted">
                      {d.domain}{' '}
                      <span className="font-mono text-[14px] tabular-nums text-[var(--store-ink)]">{d.count}</span>
                    </span>
                  ))}
                  <ArrowUpRight
                    className="ml-auto h-4 w-4 store-text-muted transition-colors duration-150 group-hover:text-[var(--store-ink)]"
                    aria-hidden
                  />
                </div>
              </StorePanel>
            </Link>
          )
        })}
      </div>

      <section className="mb-10">
        <h2 className="mb-1 store-display text-[16px] font-semibold text-[var(--store-ink)]">Head to head</h2>
        <p className="mb-3 text-[13px] store-text-body">Effect matrix for two nations, with a package you can send to the map.</p>
        <div className="flex flex-wrap gap-2">
          {HEAD_TO_HEAD.map(([a, b]) => (
            <Link key={`${a}-${b}`} href={`/force/compare?a=${a}&b=${b}`} className="btn-e sm font-mono">
              {a} vs {b}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 store-display text-[16px] font-semibold text-[var(--store-ink)]">Theatre work-ups</h2>
        <p className="mb-3 text-[13px] store-text-body">A default Blue and Red pairing, a briefing and the links to take it further.</p>
        <div className="grid gap-3 md:grid-cols-3">
          {FORCE_THEATRES.map((t) => (
            <Link key={t.id} href={`/force/theatres/${t.id}`} className="group rounded-2xl focus-visible:outline-offset-4">
              <StorePanel className="flex h-full flex-col p-5 transition-[border-color] duration-200 ease-out group-hover:border-[rgba(255,255,255,0.22)]">
                <p className="text-[12px] store-text-muted">{t.theatre}</p>
                <p className="mt-1 text-[15px] font-medium text-[var(--store-ink)]">{t.name}</p>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed store-text-body">{t.so_what}</p>
                <p className="mt-4 flex items-center gap-2 border-t border-[var(--store-line)] pt-3 font-mono text-[12px]">
                  <span className="text-[var(--wb-blue)]">{t.defaultBlue}</span>
                  <span className="store-text-muted">vs</span>
                  <span className="text-[var(--wb-red)]">{t.defaultRed}</span>
                  <ArrowUpRight
                    className="ml-auto h-4 w-4 store-text-muted transition-colors duration-150 group-hover:text-[var(--store-ink)]"
                    aria-hidden
                  />
                </p>
              </StorePanel>
            </Link>
          ))}
        </div>
      </section>
    </HubPageShell>
  )
}
