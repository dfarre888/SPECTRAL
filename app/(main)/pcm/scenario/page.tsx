import { HubPageShell } from '@/components/hub/HubPageShell'
import { ScenarioGeneratorPanel } from '@/components/pcm/ScenarioGeneratorPanel'
import { PCM_EYEBROW } from '@/lib/pcm/presentation-copy'

export default function PcmScenarioPage() {
  return (
    <HubPageShell eyebrow={PCM_EYEBROW} title="Scenario Generator" subtitle="Configure exercises from learner competency records or explicit DS objectives.">
      <ScenarioGeneratorPanel />
    </HubPageShell>
  )
}
