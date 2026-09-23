import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight, Globe } from 'lucide-react'
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

  const links: { href: string; label: string; primary?: boolean }[] = [
    {
      href: `/force/compare?a=${theatre.defaultBlue}&b=${theatre.defaultRed}&theatre=${theatre.id}`,
      label: `${theatre.defaultBlue} vs ${theatre.defaultRed} effect matrix`,
      primary: true,
    },
    { href: `/force/${theatre.defaultBlue.toLowerCase()}`, label: `${theatre.defaultBlue} ORBAT` },
    { href: `/force/${theatre.defaultRed.toLowerCase()}`, label: `${theatre.defaultRed} ORBAT` },
    { href: `/map?planVignette=force-${theatre.id}`, label: 'Planner UAS vignette' },
    { href: '/arena', label: 'Open Arena (WOPR)' },
    { href: '/pcm/force-design', label: 'PCM force design' },
  ]

  return (
    <HubPageShell
      eyebrow="Theatre work-up"
      eyebrowIcon={<Globe className="h-3.5 w-3.5" />}
      title={theatre.name}
      subtitle={theatre.theatre}
    >
      <p className="mb-5 text-[12px] store-text-muted">
        Date of information <span className="font-mono">{theatre.date_of_information}</span> · default{' '}
        <span className="font-mono text-[var(--wb-blue)]">{theatre.defaultBlue}</span> vs{' '}
        <span className="font-mono text-[var(--wb-red)]">{theatre.defaultRed}</span> · UNCLASSIFIED
      </p>

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <StorePanel className="p-6">
          <p className="wb-pane-title">Briefing</p>
          <p className="mt-3 max-w-[72ch] text-[14px] leading-relaxed store-text-body">{theatre.briefing}</p>
          <div className="mt-5 border-t border-[var(--store-line)] pt-4">
            <p className="text-[12px] store-text-muted">So what</p>
            <p className="mt-1 max-w-[72ch] text-[15px] leading-relaxed text-[var(--store-ink)]">{theatre.so_what}</p>
          </div>
        </StorePanel>

        <StorePanel className="p-5">
          <p className="wb-pane-title mb-3">Take it further</p>
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`group -mx-2 flex min-h-9 items-center gap-2 rounded-lg px-2 text-[13px] transition-colors duration-150 hover:bg-white/[0.05] ${
                    l.primary ? 'text-[var(--wb-blue)]' : 'text-[var(--store-ink)]'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{l.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 store-text-muted group-hover:text-[var(--store-ink)]" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </StorePanel>
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
