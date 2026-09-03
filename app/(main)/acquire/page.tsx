import { Suspense } from 'react'
import { ShoppingCart } from 'lucide-react'
import { AcquireWorkbench } from '@/components/acquire/AcquireWorkbench'
import { MoatAcquireSuggestions } from '@/components/acquire/MoatAcquireSuggestions'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { buildAcquireSession } from '@/lib/acquire/acquire-queries'
import {
  assertNoPkLeak,
  suggestGapsFromCompetency,
} from '@/lib/moat/acquisition-bridge'
import type { LongitudinalCompetencyRecord } from '@/lib/moat/learnerModel.types'

interface AcquirePageProps {
  searchParams?: { from?: string; template?: string; competency?: string }
}

/** Training demo record — illustrates Plan→PCM→AAR→MOAT→Acquire without DB write. */
function demoMoatRecord(): Pick<LongitudinalCompetencyRecord, 'player_id' | 'callsign' | 'blind_spots'> {
  return {
    player_id: 'demo-player',
    callsign: 'VIPER-1',
    blind_spots: [
      {
        id: 'bs-mag-1',
        competency: 'magazine_management',
        description: 'Expends kinetic interceptors early against cheap OWA — acquisition gap for point-defence SPAAG',
        first_observed_exercise_id: 'ex-demo',
        first_observed_at: '2026-07-01T00:00:00.000Z',
        recurrence_count: 3,
        sessions_observed: ['ex-demo', 'ex-demo-2'],
        severity: 'high',
        curriculum_module_assigned: null,
        status: 'active',
        resolution_evidence: null,
        trigger_conditions: ['saturation', 'owa'],
      },
    ],
  }
}

export default async function AcquirePage({ searchParams }: AcquirePageProps) {
  const templateId = searchParams?.template ?? 'shahed-darwin'
  const session = await buildAcquireSession(templateId)
  const moatSuggestions =
    searchParams?.from === 'moat' ? suggestGapsFromCompetency(demoMoatRecord()) : []
  if (moatSuggestions.length && !assertNoPkLeak(moatSuggestions)) {
    throw new Error('MOAT→Acquire Pk leak blocked')
  }

  return (
    <HubPageShell
      eyebrow="Acquire · capability gaps"
      eyebrowIcon={<ShoppingCart className="h-3.5 w-3.5" />}
      title="Close capability gaps"
      subtitle="GAP → OPTION → CALC → BRIEF workflow. OSINT economics and defeat matrix only — no accredited Pk to client."
      headerAction={
        <div className="ring-gradient glass flex flex-wrap gap-2 rounded-xl px-3 py-2">
          <div className="text-center px-2">
            <div className="hero-number text-sm text-[#F7F9FC] font-mono uppercase">{session.template.id}</div>
            <div className="text-[9px] uppercase tracking-wider store-text-muted">Template</div>
          </div>
          <div className="w-px bg-[var(--store-line)]" />
          <div className="text-center px-2">
            <div className="hero-number text-lg text-[#F7F9FC] tabular-nums">{session.defeatCoverage?.length ?? 0}</div>
            <div className="text-[9px] uppercase tracking-wider store-text-muted">Defeat rows</div>
          </div>
        </div>
      }
    >
      <Suspense fallback={null}>
        <MoatAcquireSuggestions suggestions={moatSuggestions} />
      </Suspense>
      <AcquireWorkbench initialSession={session} />
    </HubPageShell>
  )
}
