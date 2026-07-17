import { NextResponse } from 'next/server'
import {
  getTrainingForceDesignReport,
  TRAINING_FORCE_DESIGN_QUESTION,
} from '@/lib/pcm/training-fixtures'

/** Training-tier force design — no DS role required (OSINT placeholder analysis). */
export async function POST() {
  const report = getTrainingForceDesignReport(TRAINING_FORCE_DESIGN_QUESTION)
  return NextResponse.json({ report, training: true })
}
