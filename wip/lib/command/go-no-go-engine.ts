import type { GoNoGoAssessment, GoNoGoReason, GoNoGoStatus } from '@/lib/command/go-no-go-types'

export interface GoNoGoInput {
  plan_id?: string | null
  package: {
    id: string
    label: string
    primary_bearer?: {
      standard?: string | null
      pnt_dependent: boolean
      label: string
    } | null
    pace_complete: boolean
    pace_warnings: string[]
  }
  gnss: {
    jam_active: boolean
    affected_constellations: string[]
  }
  readiness: {
    pnt_status: string | null
    mag_depth: number | null
    blocking_issues?: string[]
  }
  airspace: {
    roz: unknown[]
    conflicts?: string[]
  }
  economics: {
    mag_depth: number | null
    exchange_caution?: boolean
  }
  weather: {
    available: boolean
    adverse?: boolean
    summary: string
  }
  competency: {
    available: boolean
    currency_ok: boolean | null
    summary: string
  }
}

function isLink16Primary(
  primary: GoNoGoInput['package']['primary_bearer'],
): boolean {
  if (!primary) return false
  return primary.standard === 'link16' || /link\s*16/i.test(primary.label)
}

function pntStatusDegraded(pntStatus: string | null): boolean {
  if (!pntStatus) return false
  const lower = pntStatus.toLowerCase()
  return lower.includes('jam') || lower.includes('degraded')
}

function worstStatus(current: GoNoGoStatus, next: GoNoGoStatus): GoNoGoStatus {
  if (current === 'no_go' || next === 'no_go') return 'no_go'
  if (current === 'caution' || next === 'caution') return 'caution'
  return 'go'
}

function pushReason(
  reasons: GoNoGoReason[],
  blocking: string[],
  caution: string[],
  reason: GoNoGoReason,
): void {
  reasons.push(reason)
  if (reason.severity === 'no_go') blocking.push(reason.message)
  if (reason.severity === 'caution') caution.push(reason.message)
}

export function assessGoNoGo(input: GoNoGoInput): GoNoGoAssessment {
  const reasons: GoNoGoReason[] = []
  const blocking: string[] = []
  const caution: string[] = []

  const blockingIssues = input.readiness.blocking_issues ?? []
  if (blockingIssues.length > 0) {
    for (const issue of blockingIssues) {
      pushReason(reasons, blocking, caution, {
        code: 'READINESS_BLOCKING',
        severity: 'no_go',
        message: issue,
      })
    }
  }

  const airspaceConflicts = input.airspace.conflicts ?? []
  if (airspaceConflicts.length > 0) {
    for (const conflict of airspaceConflicts) {
      pushReason(reasons, blocking, caution, {
        code: 'AIRSPACE_CONFLICT',
        severity: 'no_go',
        message: conflict,
      })
    }
  }

  if (
    isLink16Primary(input.package.primary_bearer) &&
    input.package.primary_bearer?.pnt_dependent &&
    input.gnss.jam_active
  ) {
    pushReason(reasons, blocking, caution, {
      code: 'LINK16_PNT_JAM',
      severity: 'caution',
      message: 'Primary Link 16 bearer is PNT-dependent while GNSS jamming is active',
    })
  }

  if (!input.package.pace_complete || input.package.pace_warnings.length > 0) {
    const detail =
      input.package.pace_warnings.length > 0
        ? input.package.pace_warnings.join('; ')
        : 'PACE ladder incomplete'
    pushReason(reasons, blocking, caution, {
      code: 'PACE_INCOMPLETE',
      severity: 'caution',
      message: detail,
    })
  }

  const magDepth = input.economics.mag_depth ?? input.readiness.mag_depth
  if ((magDepth !== null && magDepth < 2) || input.economics.exchange_caution) {
    pushReason(reasons, blocking, caution, {
      code: 'ECONOMICS_MAG',
      severity: 'caution',
      message:
        magDepth !== null && magDepth < 2
          ? `Magazine depth ${magDepth} below minimum salvo reserve`
          : 'Unfavourable cost exchange — preserve low-cost effectors',
    })
  }

  if (input.weather.adverse) {
    pushReason(reasons, blocking, caution, {
      code: 'WEATHER_ADVERSE',
      severity: 'caution',
      message: input.weather.summary || 'Adverse weather reported',
    })
  }

  if (input.competency.available && input.competency.currency_ok === false) {
    pushReason(reasons, blocking, caution, {
      code: 'COMPETENCY_CURRENCY',
      severity: 'caution',
      message: input.competency.summary || 'Crew currency gaps detected',
    })
  }

  if (pntStatusDegraded(input.readiness.pnt_status)) {
    pushReason(reasons, blocking, caution, {
      code: 'PNT_DEGRADED',
      severity: 'caution',
      message: `PNT status: ${input.readiness.pnt_status}`,
    })
  }

  let status: GoNoGoStatus = 'go'
  if (blocking.length > 0) status = 'no_go'
  else if (caution.length > 0) status = 'caution'

  const paceStatus: GoNoGoStatus =
    !input.package.pace_complete || input.package.pace_warnings.length > 0 ? 'caution' : 'go'

  let pntStatus: GoNoGoStatus = 'go'
  if (input.gnss.jam_active && input.package.primary_bearer?.pnt_dependent) {
    pntStatus = 'caution'
  }
  if (pntStatusDegraded(input.readiness.pnt_status)) {
    pntStatus = 'caution'
  }

  const economicsStatus: GoNoGoStatus =
    (magDepth !== null && magDepth < 2) || input.economics.exchange_caution ? 'caution' : 'go'

  const weatherStatus: GoNoGoStatus = input.weather.adverse ? 'caution' : 'go'

  const airspaceStatus: GoNoGoStatus = airspaceConflicts.length > 0 ? 'no_go' : 'go'

  let competencyStatus: GoNoGoStatus = 'go'
  if (!input.competency.available) {
    competencyStatus = 'caution'
  } else if (input.competency.currency_ok === false) {
    competencyStatus = 'caution'
  }

  return {
    status,
    blocking,
    caution,
    reasons,
    assessed_at: new Date().toISOString(),
    plan_id: input.plan_id ?? null,
    package_id: input.package.id,
    package_label: input.package.label,
    tiles: {
      pace: {
        status: paceStatus,
        summary: input.package.pace_complete
          ? input.package.pace_warnings[0] ?? 'PACE ladder complete'
          : 'PACE ladder incomplete',
      },
      pnt: {
        status: pntStatus,
        summary: input.gnss.jam_active
          ? `GNSS jam active${input.gnss.affected_constellations.length ? ` — ${input.gnss.affected_constellations.join(', ')}` : ''}`
          : input.readiness.pnt_status ?? 'PNT nominal',
        jam_active: input.gnss.jam_active,
      },
      economics: {
        status: economicsStatus,
        summary:
          magDepth !== null
            ? `Magazine depth ${magDepth} rounds`
            : 'Economics baseline — OSINT exchange ratios',
        mag_depth: magDepth,
      },
      weather: {
        status: weatherStatus,
        summary: input.weather.summary,
      },
      airspace: {
        status: airspaceStatus,
        summary:
          airspaceConflicts.length > 0
            ? `${airspaceConflicts.length} airspace conflict(s)`
            : `${input.airspace.roz.length} ROZ polygon(s) defined`,
        roz_count: input.airspace.roz.length,
      },
      competency: {
        status: competencyStatus,
        summary: input.competency.summary,
        ds_only: true,
      },
    },
  }
}
