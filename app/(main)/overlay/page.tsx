import { HubPageShell } from '@/components/hub/HubPageShell'
import { EngagementPanel } from '@/components/overlay/EngagementPanel'
import { SAM_MATRIX_PLATFORMS } from '@/lib/defeat/sam-matrix-bridge'
import { getPlatformsByIds } from '@/lib/platforms/queries'

export default async function OverlayPage() {
  const platforms = await getPlatformsByIds([...SAM_MATRIX_PLATFORMS])

  return (
    <HubPageShell
      eyebrow="Engagement Analysis"
      title="SAM 1v1 Overlay"
      subtitle="Reference-geometry intercept Pk for SAM systems against matrix UAS platforms. Map geometry view integrates with Map Intel."
      maxWidthClass="max-w-[1400px]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 min-h-[480px]">
        <div className="store-panel rounded-2xl p-6 flex flex-col justify-center items-center text-center border border-dashed border-white/10">
          <p className="text-sm text-white font-medium">Engagement geometry</p>
          <p className="text-xs store-text-body mt-2 max-w-md font-mono">
            Cesium range rings and LOS visualisation — use Map Intel laydown for full 3D envelope rehearsal.
          </p>
        </div>
        <div className="store-panel rounded-2xl border border-[var(--store-line)]">
          <EngagementPanel platforms={platforms} />
        </div>
      </div>
    </HubPageShell>
  )
}
