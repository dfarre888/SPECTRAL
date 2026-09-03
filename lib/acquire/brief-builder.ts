/**
 * BRIEF builder — markdown acquisition brief with OSINT sources
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type {
  AcquireCalcResult,
  AcquireTemplate,
  AcquisitionBrief,
  GapAnalysisResult,
  RankedAcquireOption,
} from '@/lib/acquire/acquire-types'

export function buildAcquisitionBrief(
  template: AcquireTemplate,
  gap: GapAnalysisResult,
  options: RankedAcquireOption[],
  calc: AcquireCalcResult,
): AcquisitionBrief {
  const osintSources = [
    ...new Set(options.map((o) => o.source_ref).filter(Boolean)),
    'Defeat Matrix — OSINT effectiveness baselines (Training tier, not accredited Pk)',
    'engagement_economics — unit cost seed from RUSI / CSIS / manufacturer press',
  ]

  const structured = {
    title: template.title,
    threat: gap.threat_name,
    location: gap.location,
    gap_summary: gap.narrative,
    options: options.map((o) => ({
      rank: o.rank,
      system: o.defeat_system_name,
      cost_per_kill_usd: Math.round(o.cost_per_expected_kill_usd),
      confidence: o.cost_confidence,
      source_ref: o.source_ref,
    })),
    osint_sources: osintSources,
    training_note:
      'MOAT blind-spot training stub: link crew competency gaps via Currency Queue when DS view unavailable.',
  }

  const optionLines = options
    .map(
      (o) =>
        `### ${o.rank}. ${o.defeat_system_name}\n` +
        `- **$/expected kill:** $${Math.round(o.cost_per_expected_kill_usd).toLocaleString('en-US')}\n` +
        `- **Exchange ratio:** ${o.exchange.exchangeRatio.toFixed(0)}:1\n` +
        `- **Pk (OSINT):** ${(o.pk * 100).toFixed(0)}% — not accredited\n` +
        `- **Confidence:** ${o.cost_confidence}\n` +
        `- **Source:** ${o.source_ref}\n` +
        `- ${o.rationale}`,
    )
    .join('\n\n')

  const markdown = `# ${template.title}

> UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

## Gap summary

**Threat:** ${gap.threat_name} (\`${gap.threat_platform_id}\`)  
**Location:** ${gap.location} (${gap.base_id})  
**Severity:** ${gap.severity.toUpperCase()}

${gap.narrative}

### OrBat context
${gap.orbat_summary.map((s) => `- ${s}`).join('\n')}

### Coverage gaps
${gap.coverage_gaps.map((s) => `- ${s}`).join('\n')}

## Ranked acquisition options

${optionLines}

## Economics note

Recommended fielding: **${calc.recommended_option_id}**. ${calc.salvo_note}

## OSINT sources

${osintSources.map((s) => `- ${s}`).join('\n')}

## Training & force design

- Force Design: \`/pcm/force-design\` — parallel laydown analysis before procurement
- ${structured.training_note}
`

  return { markdown, structured }
}
