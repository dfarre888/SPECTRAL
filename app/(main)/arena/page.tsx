import dynamic from 'next/dynamic'
import { WoprScenarioPanel } from '@/components/arena/WoprScenarioPanel'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'

const CesiumArena = dynamic(() => import('@/components/arena/CesiumArena'), {
  ssr: false,
  loading: () => (
    <div className="h-64 store-text-muted text-sm font-mono flex items-center justify-center">
      Loading 3D COP…
    </div>
  ),
})

export default function ArenaPage() {
  return (
    <HubPageShell
      eyebrow="Wargaming"
      title="Red/Blue Arena"
      subtitle="WOPR live scenario engine — SSE COP, fog-of-war, time-stepped propagation"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <WoprScenarioPanel />
        <StorePanel className="p-2 min-h-[320px]">
          <p className="text-[10px] store-text-muted font-mono uppercase px-2 py-1 mb-1">
            3D battlespace COP
          </p>
          <div className="h-[400px] rounded-xl overflow-hidden">
            <CesiumArena entities={[]} center={{ lon: 149.13, lat: -35.28 }} />
          </div>
        </StorePanel>
      </div>
    </HubPageShell>
  )
}
