import Link from 'next/link'
import { Flag } from 'lucide-react'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'
import { FORCE_THEATRES } from '@/lib/force/theatres'
import { getAllNationForces } from '@/lib/force/queries'

export default async function ForceIndexPage() {
  const forces = await getAllNationForces()
  const catalog = forces.reduce((n, f) => n + f.catalog_count, 0)

  return (
    <HubPageShell
      eyebrow="National force catalogue"
      eyebrowIcon={<Flag className="h-3.5 w-3.5" />}
      title="Force / ORBAT"
      subtitle="Air, land, and maritime types by nation. Compare effects, then send a package to the map. Not a drone library — F-35 and Shahed stay in different catalogues."
    >
      <p className="mb-4 text-[11px] font-mono store-text-muted">
        Date of information: August 2026 · {catalog} catalog types · 7 nations · UNCLASSIFIED OSINT
      </p>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {forces.map((f) => (
          <Link key={f.nation.code} href={`/force/${f.nation.code.toLowerCase()}`}>
            <StorePanel className="h-full p-4 hover:border-[var(--store-accent-border)]">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[10px] text-[var(--store-accent)]">{f.nation.code}</p>
                <p className="font-mono text-[10px] uppercase store-text-muted">{f.nation.side}</p>
              </div>
              <p className="text-lg font-medium text-white">{f.nation.shortName}</p>
              <p className="mt-1 font-mono text-xs store-text-muted">
                {f.domain.map((d) => `${d.domain} ${d.count}`).join(' · ')}
              </p>
              <p className="mt-2 text-xs store-text-body">{f.nation.note}</p>
            </StorePanel>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-medium text-white">Head-to-head</h2>
      <div className="mb-8 flex flex-wrap gap-2">
        {[
          ['AUS', 'CHN'],
          ['USA', 'CHN'],
          ['USA', 'PRK'],
          ['JPN', 'CHN'],
          ['AUS', 'RUS'],
        ].map(([a, b]) => (
          <Link
            key={`${a}-${b}`}
            href={`/force/compare?a=${a}&b=${b}`}
            className="rounded-lg border border-[var(--store-line)] px-3 py-1.5 text-xs text-white hover:border-[var(--store-accent-border)]"
          >
            {a} vs {b}
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-medium text-white">Theatre work-ups</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {FORCE_THEATRES.map((t) => (
          <Link key={t.id} href={`/force/theatres/${t.id}`}>
            <StorePanel className="h-full p-4 hover:border-[var(--store-accent-border)]">
              <p className="font-mono text-[10px] text-[var(--store-accent)]">{t.theatre}</p>
              <p className="mt-1 text-sm font-medium text-white">{t.name}</p>
              <p className="mt-2 text-xs store-text-body">{t.so_what}</p>
            </StorePanel>
          </Link>
        ))}
      </div>
    </HubPageShell>
  )
}
