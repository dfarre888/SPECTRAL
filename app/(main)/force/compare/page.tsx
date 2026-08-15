import { redirect } from 'next/navigation'
import { GitCompare } from 'lucide-react'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { NationCompareClient } from '@/components/force/NationCompareClient'
import { buildNationCompare } from '@/lib/force/compare'
import { parseNationCode } from '@/lib/force/nations'
import { getNationForce } from '@/lib/force/queries'
import { getTheatre } from '@/lib/force/theatres'

interface PageProps {
  searchParams: { a?: string; b?: string; theatre?: string }
}

export default async function ForceComparePage({ searchParams }: PageProps) {
  const aCode = parseNationCode(searchParams.a) ?? 'AUS'
  const bCode = parseNationCode(searchParams.b) ?? 'CHN'
  if (aCode === bCode) redirect(`/force/compare?a=${aCode}&b=${aCode === 'CHN' ? 'AUS' : 'CHN'}`)

  const [a, b] = await Promise.all([getNationForce(aCode), getNationForce(bCode)])
  if (!a || !b) redirect('/force')

  const compare = buildNationCompare(a, b)
  const theatre = getTheatre(searchParams.theatre)

  return (
    <HubPageShell
      eyebrow="Nation vs nation"
      eyebrowIcon={<GitCompare className="h-3.5 w-3.5" />}
      title={`${a.nation.shortName} vs ${b.nation.shortName}`}
      subtitle="Effect matrix. No winner banner. Type counts are catalog depth, not a campaign result."
    >
      <NationCompareClient compare={compare} theatreId={theatre?.id ?? 'scs'} />
    </HubPageShell>
  )
}
