import { BmiIntelClient } from '@/components/bmi/BmiIntelClient'
import { fetchBmiExercise } from '@/lib/bmi/bmi-queries'

export default async function BmiPage() {
  const bundle = await fetchBmiExercise('PITCH_BLACK_2026')

  return (
    <div className="max-w-[100rem] mx-auto">
      <header>
        <h1 className="page-title m-0">Pitch Black 2026</h1>
        <p className="page-lede">
          Battlespace management for a multinational air exercise: who can talk to whom, the PACE plan between any two
          platforms, and where coalition comms crowd the spectrum. OSINT only.
        </p>
      </header>
      <BmiIntelClient bundle={bundle} />
    </div>
  )
}
