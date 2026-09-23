import { HubPageShell } from '@/components/hub/HubPageShell';
import { EngagementEconomicsPanel } from '@/components/planner/EngagementEconomicsPanel';
import { CostExchangeMatrix } from '@/components/planner/CostExchangeMatrix';

export default function EconomicsPage() {
  return (
    <HubPageShell
      eyebrow="Engagement Economics"
      title="Cost exchange and salvo analysis"
      subtitle="OSINT cost bands across every threat and effector pairing, plus magazine leak-through."
    >
      <CostExchangeMatrix />
      <section className="mt-12">
        <h2 className="store-display mb-4 text-[17px] font-semibold tracking-[-0.01em] text-[var(--store-ink)]">
          Magazine depth
        </h2>
        <EngagementEconomicsPanel />
      </section>
    </HubPageShell>
  );
}
