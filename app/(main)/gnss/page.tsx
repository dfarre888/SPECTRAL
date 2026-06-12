import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'

export default function GnssPage() {
  return (
    <HubPageShell
      eyebrow="Navigation Warfare"
      title="GNSS Intelligence"
      subtitle="Constellations, jamming threats, and defeat methods — module implementation pending"
    >
      <StorePanel className="p-8 flex items-center justify-center min-h-[200px]">
        <p className="store-text-muted text-sm font-mono">[ gnss module ]</p>
      </StorePanel>
    </HubPageShell>
  )
}
