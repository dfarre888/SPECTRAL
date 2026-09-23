import { ArenaWorkspace } from '@/components/arena/ArenaWorkspace'
import { HubPageShell } from '@/components/hub/HubPageShell'

export default function ArenaPage() {
  return (
    <HubPageShell
      eyebrow="Wargaming"
      title="Red/Blue Arena"
      subtitle="WOPR live scenario engine: a streamed common operating picture, fog of war and time-stepped propagation. The training tier uses OSINT vignettes when the Operations API is unavailable."
      maxWidthClass="max-w-[1600px]"
    >
      <ArenaWorkspace />
    </HubPageShell>
  )
}
