import { HubPageShell } from '@/components/hub/HubPageShell'
import { ScenarioGeneratorPanel } from '@/components/pcm/ScenarioGeneratorPanel'

export default function PcmScenarioPage() {
  return (
    <HubPageShell eyebrow="PCM Training" title="Scenario Generator" subtitle="Configure exercises from learner competency records or explicit DS objectives.">
      <ScenarioGeneratorPanel />
    </HubPageShell>
  )
}
