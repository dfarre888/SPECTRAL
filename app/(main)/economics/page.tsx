import { HubPageShell } from '@/components/hub/HubPageShell';
import { EngagementEconomicsPanel } from '@/components/planner/EngagementEconomicsPanel';
import { CostExchangeMatrix } from '@/components/planner/CostExchangeMatrix';
import { DaysOfFirePanel } from '@/components/planner/DaysOfFirePanel';
import { loadDaysOfFireEvidence } from '@/lib/planner/days-of-fire-queries';

export default async function EconomicsPage() {
  const { evidence, defeatMatrixRecords } = await loadDaysOfFireEvidence();

  return (
    <HubPageShell
      eyebrow="Engagement Economics"
      title="Cost exchange and salvo analysis"
      subtitle="OSINT cost bands across every threat and effector pairing, how long magazines last under repeated raids, and single-magazine leak-through."
    >
      <CostExchangeMatrix
        afterRanking={
          <section id="days-of-fire" aria-labelledby="days-of-fire-title">
            <div className="mb-4">
              <h2
                id="days-of-fire-title"
                className="store-display text-[17px] font-semibold tracking-[-0.01em] text-[var(--store-ink)]"
              >
                Days of fire
              </h2>
              <p className="mt-1 max-w-[88ch] text-[13px] store-text-body">
                How long a defended site lasts under repeated raids, and what it costs. Threats meet the cheapest
                effective layer first and move up the ladder as magazines run dry. Deterministic, expected values.
              </p>
            </div>
            <DaysOfFirePanel evidence={evidence} defeatMatrixRecords={defeatMatrixRecords} />
          </section>
        }
      />
      <section className="mt-12">
        <h2 className="store-display mb-4 text-[17px] font-semibold tracking-[-0.01em] text-[var(--store-ink)]">
          Magazine depth
        </h2>
        <EngagementEconomicsPanel />
      </section>
    </HubPageShell>
  );
}
