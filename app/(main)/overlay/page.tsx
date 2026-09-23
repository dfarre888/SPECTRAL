import { HubPageShell } from '@/components/hub/HubPageShell'
import { OverlayWorkspace } from '@/components/overlay/OverlayWorkspace'
import { SAM_MATRIX_PLATFORMS } from '@/lib/defeat/sam-matrix-bridge'
import { getPlatformsByIds } from '@/lib/platforms/queries'

export default async function OverlayPage() {
  const platforms = await getPlatformsByIds([...SAM_MATRIX_PLATFORMS])

  return (
    <HubPageShell
      eyebrow="Engagement Analysis"
      title="SAM Engagement Overlay"
      subtitle="Reference-geometry intercept Pk for SAM systems against matrix UAS platforms, with live range rings and line of sight on the globe."
      maxWidthClass="max-w-[1400px]"
    >
      <OverlayWorkspace platforms={platforms} />
    </HubPageShell>
  )
}
