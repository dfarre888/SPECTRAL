import { HubPageShell } from '@/components/hub/HubPageShell'
import { CoalitionWorkspace } from '@/components/coalition/CoalitionWorkspace'
import { toInteropPlatforms } from '@/lib/coalition/catalog-adapter'
import { CATALOG_NATIONS, FORCE_CATALOG } from '@/data/force-catalog'

export default function CoalitionPage() {
  // Reduced server-side: the client only needs identity plus comms fit, not the
  // full catalogue record.
  const platforms = toInteropPlatforms(FORCE_CATALOG as never)
  const nations = CATALOG_NATIONS.map((n) => ({
    code: n.code,
    name: n.name,
    side: n.force_side,
  }))

  return (
    <HubPageShell
      eyebrow="Coalition"
      title="Comms Linkage"
      subtitle="Who can actually share a picture — track, data and voice connectivity across a coalition, placed on the spectrum they occupy."
    >
      <CoalitionWorkspace platforms={platforms} nations={nations} />
    </HubPageShell>
  )
}
