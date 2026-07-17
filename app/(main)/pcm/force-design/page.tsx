import { HubPageShell } from '@/components/hub/HubPageShell'
import { ForceDesignWorkbench } from '@/components/pcm/ForceDesignWorkbench'
import { PCM_EYEBROW } from '@/lib/pcm/presentation-copy'

export default function PcmForceDesignPage() {
  return (
    <HubPageShell eyebrow={PCM_EYEBROW} title="Force Design Analysis" subtitle="Multi-run procurement decision support against adaptive threat profiles.">
      <ForceDesignWorkbench />
    </HubPageShell>
  )
}
