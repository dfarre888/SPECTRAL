import { HubPageShell } from '@/components/hub/HubPageShell'
import { ForceDesignWorkbench } from '@/components/pcm/ForceDesignWorkbench'

export default function PcmForceDesignPage() {
  return (
    <HubPageShell eyebrow="PCM Training" title="Force Design Analysis" subtitle="Multi-run procurement decision support against adaptive threat profiles.">
      <ForceDesignWorkbench />
    </HubPageShell>
  )
}
