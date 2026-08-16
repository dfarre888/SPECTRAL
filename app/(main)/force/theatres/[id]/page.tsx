import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Globe } from 'lucide-react'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'
import { SendToMapBar } from '@/components/force/SendToMapBar'
import { getNationForce } from '@/lib/force/queries'
import { getTheatre } from '@/lib/force/theatres'

interface PageProps {
  params: { id: string }
}

export default async function TheatrePage({ params }: PageProps) {
  const theatre = getTheatre(params.id)
  if (!theatre) notFound()

  const [blue, red] = await Promise.all([
    getNationForce(theatre.defaultBlue),
    getNationForce(theatre.defaultRed),
  ])

  const selectedIds = [
    ...(blue?.platforms.filter((p) => p.effect === 'find' || p.effect === 'shield').slice(0, 6).map((p) => p.id) ?? []),
    ...(red?.platforms.filter((p) => p.effect === 'finish' || p.effect === 'sea_control').slice(0, 6).map((p) => p.id) ?? []),
  ]

  return (
    <HubPageShell
      eyebrow="Theatre work-up"
      eyebrowIcon={<Globe className="h-3.5 w-3.5" />}
      title={theatre.name}
      subtitle={theatre.theatre}
    >
      <p className="mb-4 text-[11px] font-mono store-text-muted">
        Date of information: {theatre.date_of_information} · Default {theatre.defaultBlue} vs {theatre.defaultRed} ·
        UNCLASSIFIED
      </p>

      <StorePanel className="mb-4 p-4">
        <p className="text-[10px] font-mono uppercase store-text-muted">Briefing</p>
        <p className="mt-2 text-sm store-text-body">{theatre.briefing}</p>
        <p className="mt-3 text-sm text-white">{theatre.so_what}</p>
      </StorePanel>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={`/force/compare?a=${theatre.defaultBlue}&b=${theatre.defaultRed}&theatre=${theatre.id}`}
          className="rounded-lg border border-[var(--store-line)] px-3 py-1.5 text-xs text-white"
        >
          {theatre.defaultBlue} vs {theatre.defaultRed} matrix
        </Link>
        <Link
          href={`/force/${theatre.defaultBlue.toLowerCase()}`}
          className="rounded-lg border border-[var(--store-line)] px-3 py-1.5 text-xs store-text-body"
        >
          {theatre.defaultBlue} ORBAT
        </Link>
        <Link
          href={`/force/${theatre.defaultRed.toLowerCase()}`}
          className="rounded-lg border border-[var(--store-line)] px-3 py-1.5 text-xs store-text-body"
        >
          {theatre.defaultRed} ORBAT
        </Link>
        <Link
          href={`/map?planVignette=force-${theatre.id}`}
          className="rounded-lg border border-[var(--store-line)] px-3 py-1.5 text-xs store-text-body"
        >
          Planner UAS vignette
        </Link>
        <Link
          href={`/arena`}
          className="rounded-lg border border-[var(--store-line)] px-3 py-1.5 text-xs store-text-body"
        >
          Open Arena (WOPR)
        </Link>
        <Link
          href={`/pcm/force-design`}
          className="rounded-lg border border-[var(--store-line)] px-3 py-1.5 text-xs store-text-body"
        >
          PCM force design
        </Link>
      </div>

      <SendToMapBar
        blue={theatre.defaultBlue}
        red={theatre.defaultRed}
        selectedIds={selectedIds}
        theatreId={theatre.id}
      />
    </HubPageShell>
  )
}
