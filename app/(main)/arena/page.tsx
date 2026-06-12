import { WoprScenarioPanel } from '@/components/arena/WoprScenarioPanel'
import { HubPageShell } from '@/components/hub/HubPageShell'

export default function ArenaPage() {
  return (
    <HubPageShell
      eyebrow="Wargaming"
      title="Red/Blue Arena"
      subtitle="WOPR live scenario engine — SSE COP, fog-of-war, time-stepped propagation"
    >
      <WoprScenarioPanel />
    </HubPageShell>
  )
}
