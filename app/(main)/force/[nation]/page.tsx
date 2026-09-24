import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Flag } from 'lucide-react'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { CountryOrbatClient } from '@/components/force/CountryOrbatClient'
import { OrbatComposer } from '@/components/force/OrbatComposer'
import { parseNationCode } from '@/lib/force/nations'
import { getNationForce } from '@/lib/force/queries'

interface PageProps {
  params: { nation: string }
}

export default async function ForceNationPage({ params }: PageProps) {
  const code = parseNationCode(params.nation)
  if (!code) notFound()
  const force = await getNationForce(code)
  if (!force) notFound()
  const compareDefault = force.nation.side === 'red' ? 'AUS' : 'CHN'

  return (
    <HubPageShell
      eyebrow="Country force"
      eyebrowIcon={<Flag className="h-3.5 w-3.5" />}
      title={force.nation.name}
      subtitle={force.nation.note}
      headerAction={
        <div className="flex flex-wrap gap-2">
          <Link href={`/force/compare?a=${force.nation.code}&b=${compareDefault}`} className="btn-glass">
            Compare with {compareDefault}
          </Link>
          <Link href="/force" className="btn-glass">
            All nations
          </Link>
        </div>
      }
    >
      <p className="mb-5 text-[12px] store-text-muted">
        Date of information <span className="font-mono">August 2026</span> ·{' '}
        <span className="font-mono tabular-nums">{force.catalog_count}</span> catalogue types · UNCLASSIFIED ·
        manufacturer sheets are Assessed or Estimated, never Confirmed
      </p>
      {force.catalog_count === 0 ? (
        <p className="text-sm store-text-body">
          No BMI catalog rows on this database. Confirm .env.local points at the SPECTRAL project (ewmonpfznutfviouqdbr) and reload.
        </p>
      ) : (
        <>
          <CountryOrbatClient force={force} compareDefault={compareDefault} />

          <div className="mt-12 mb-4 max-w-[80ch]">
            <h2 className="store-display text-[18px] font-semibold tracking-[-0.01em] text-[var(--store-ink)]">
              Battle plan: package composition
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed store-text-body">
              Toggle platforms in and out of the package. The rollup tracks how many platforms sit on each comms band
              and which sensor bands stay covered, so dropping an airframe shows its cost immediately. A band held by
              one platform is flagged before it is lost.
            </p>
          </div>
          <OrbatComposer
            nationLabel={force.nation.name}
            platforms={force.platforms.map((p) => ({
              id: p.id,
              label: p.short_name || p.designation,
              domain: p.domain,
              role: p.role,
              comms: p.comms.map((c) => ({ kind: c.kind, standard: c.standard, band: c.band })),
              sensors: p.sensors.map((s2) => ({ band: s2.band, kind: s2.kind })),
            }))}
          />
        </>
      )}
    </HubPageShell>
  )
}
