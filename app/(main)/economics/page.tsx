import { HubPageShell } from '@/components/hub/HubPageShell';
import { EngagementEconomicsPanel } from '@/components/planner/EngagementEconomicsPanel';
import { CostExchangeMatrix } from '@/components/planner/CostExchangeMatrix';

export default function EconomicsPage() {
  return (
    <HubPageShell
      eyebrow="Engagement Economics"
      title="Cost exchange & salvo analysis"
      subtitle="OSINT cost bands across every threat and effector pairing, plus magazine leak-through."
    >
      <CostExchangeMatrix />
      <h2 className="text-sm font-semibold text-white mt-8 mb-2">Magazine depth</h2>
      <EngagementEconomicsPanel />
    </HubPageShell>
  );
}
