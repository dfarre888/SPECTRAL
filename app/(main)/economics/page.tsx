import { HubPageShell } from '@/components/hub/HubPageShell';
import { EngagementEconomicsPanel } from '@/components/planner/EngagementEconomicsPanel';

export default function EconomicsPage() {
  return (
    <HubPageShell
      eyebrow="Engagement Economics"
      title="Cost exchange & salvo analysis"
      subtitle="OSINT unit costs — Shahed vs SAM exchange ratios and magazine leak-through."
    >
      <EngagementEconomicsPanel />
    </HubPageShell>
  );
}
