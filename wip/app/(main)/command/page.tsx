import { Suspense } from 'react'
import { CommandBoardClient } from '@/components/command/CommandBoardClient'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { fetchCommandPlans } from '@/lib/command/command-board-data'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'

export const dynamic = 'force-dynamic'

export default async function CommandPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Demo mode may elevate auth; OSINT board still loads with empty plan list.
  const userId = user?.id ?? (isDemoMode() ? 'demo-user' : '')
  const plans = userId ? await fetchCommandPlans(userId) : []

  return (
    <HubPageShell
      eyebrow="Command · daily launch"
      title="GO/NO-GO Board"
      subtitle="Daily launch criteria — PACE, PNT, economics, weather, airspace, competency. OSINT defaults when no plan selected."
      headerAction={
        <div className="ring-gradient glass rounded-xl px-4 py-2 text-center">
          <div className="hero-number text-lg text-[#F7F9FC] tabular-nums">{plans.length}</div>
          <div className="text-[9px] uppercase tracking-wider store-text-muted">
            Plan{plans.length === 1 ? '' : 's'} in scope
          </div>
        </div>
      }
    >
      <Suspense fallback={<p className="text-sm font-mono store-text-muted">Loading GO/NO-GO board…</p>}>
        <CommandBoardClient initialPlans={plans} initialPlanId={plans[0]?.id ?? null} />
      </Suspense>
    </HubPageShell>
  )
}
