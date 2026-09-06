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
          <Link
            href={`/force/compare?a=${force.nation.code}&b=${compareDefault}`}
            className="rounded-lg border border-[var(--store-line)] px-3 py-1.5 text-xs text-white"
          >
            Compare vs {compareDefault}
          </Link>
          <Link href="/force" className="rounded-lg border border-[var(--store-line)] px-3 py-1.5 text-xs store-text-body">
            All nations
          </Link>
        </div>
      }
    >
      <p className="mb-4 text-[11px] font-mono store-text-muted">
        Date of information: August 2026 · {force.catalog_count} catalog types · UNCLASSIFIED · manufacturer sheets are
        Assessed/Estimated, never Confirmed
      </p>
      {force.catalog_count === 0 ? (
        <p className="text-sm store-text-body">
          No BMI catalog rows on this database. Confirm .env.local points at Sydney (nxnukrnkbxiqberymqzq) and reload.
        </p>
      ) : (
        <>
          <CountryOrbatClient force={force} compareDefault={compareDefault} />

          <h2 className="text-sm font-semibold text-white mt-8 mb-1">Battle plan — package composition</h2>
          <p className="text-xs store-text-body mb-3 max-w-3xl">
            Toggle platforms in and out of the package. The rollup tracks how many platforms sit on
            each comms band and which sensor bands stay covered, so dropping an airframe shows its
            cost immediately — a band held by one platform is flagged before it is lost.
          </p>
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
