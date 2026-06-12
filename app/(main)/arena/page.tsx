import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'

export default function ArenaPage() {
  return (
    <HubPageShell
      eyebrow="Wargaming"
      title="Red/Blue Arena"
      subtitle="Adversarial scenario engine and exercise briefs — module implementation pending"
    >
      <StorePanel className="p-8 flex items-center justify-center min-h-[200px]">
        <p className="store-text-muted text-sm font-mono">[ arena module ]</p>
      </StorePanel>
    </HubPageShell>
  )
}
