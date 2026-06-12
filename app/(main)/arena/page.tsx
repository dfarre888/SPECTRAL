import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'

export default function ArenaPage() {
  return (
    <HubPageShell
      eyebrow="Wargaming"
      title="Red/Blue Arena"
      subtitle="WOPR live scenario engine — SSE COP, fog-of-war, time-stepped propagation"
    >
      <StorePanel className="p-8 flex items-center justify-center min-h-[200px]">
        <p className="store-text-muted text-sm font-mono">[ arena module ]</p>
      </StorePanel>
    </HubPageShell>
  )
}
