'use client'

import type { BmiExerciseBundle } from '@/lib/bmi/bmi-types'
import { BmiDashboard } from '@/components/bmi/BmiDashboard'

interface BmiIntelClientProps {
  bundle: BmiExerciseBundle
}

export function BmiIntelClient({ bundle }: BmiIntelClientProps) {
  return <BmiDashboard bundle={bundle} />
}
