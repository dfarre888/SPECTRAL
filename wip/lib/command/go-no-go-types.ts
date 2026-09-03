export type GoNoGoStatus = 'go' | 'caution' | 'no_go'

export interface GoNoGoReason {
  code: string
  severity: GoNoGoStatus
  message: string
}

export interface GoNoGoAssessment {
  status: GoNoGoStatus
  blocking: string[]
  caution: string[]
  reasons: GoNoGoReason[]
  assessed_at: string
  plan_id: string | null
  package_id: string | null
  package_label: string
  tiles: {
    pace: { status: GoNoGoStatus; summary: string }
    pnt: { status: GoNoGoStatus; summary: string; jam_active: boolean }
    economics: { status: GoNoGoStatus; summary: string; mag_depth: number | null }
    weather: { status: GoNoGoStatus; summary: string }
    airspace: { status: GoNoGoStatus; summary: string; roz_count: number }
    competency: { status: GoNoGoStatus; summary: string; ds_only: true }
  }
}
