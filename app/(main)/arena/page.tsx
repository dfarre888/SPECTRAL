import { ArenaWorkspace } from '@/components/arena/ArenaWorkspace'
import { HubPageShell } from '@/components/hub/HubPageShell'

export default function ArenaPage() {
  return (
    <HubPageShell
      eyebrow="Wargaming"
      title="Red/Blue Arena"
      subtitle="WOPR scenario engine: a streamed common operating picture with fog of war and time-stepped propagation. Replay any turn, branch the game from it, and export for analysis or federation. The training tier uses OSINT vignettes when the Operations API is unavailable."
      maxWidthClass="max-w-[1600px]"
    >
      <ArenaWorkspace />
    </HubPageShell>
  )
}
