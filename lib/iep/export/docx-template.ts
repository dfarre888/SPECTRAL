import 'server-only'
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
} from 'docx'
import { buildCensusEvidenceNote } from '@/lib/iep/census-evidence'
import { IEP_SUPPORT_AREA_LABELS, NCCD_ADJUSTMENT_LABELS } from '@/lib/iep/types'
import type { IepPlanRow } from '@/lib/iep/types'

const AI_WATERMARK = 'AI-Assisted Draft — For Professional Review'

function p(text: string, opts?: { bold?: boolean; italic?: boolean }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts?.bold, italics: opts?.italic })],
    spacing: { after: 120 },
  })
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } })
}

export async function buildIepDocx(plan: IepPlanRow): Promise<Buffer> {
  const censusNote =
    plan.monitoring_plan.census_evidence_note ?? buildCensusEvidenceNote(plan.school_year)

  const sections: Paragraph[] = [
    heading(plan.document_title, HeadingLevel.TITLE),
    p(`${plan.state_territory} · ${plan.school_name ?? ''} · Year ${plan.year_level ?? ''}`, {
      italic: true,
    }),
    p(`Classification: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY`, { italic: true }),
    p(AI_WATERMARK, { bold: true, italic: true }),

    heading('Student profile', HeadingLevel.HEADING_1),
    p(plan.student_profile.functional_impact ?? ''),
    p(`Strengths: ${plan.student_profile.strengths ?? ''}`),
    p(`Needs: ${plan.student_profile.needs_summary ?? ''}`),
    p(plan.student_profile.ndis_school_interface_note ?? ''),

    heading('Present levels', HeadingLevel.HEADING_1),
    p(plan.present_levels.summary ?? ''),
    ...Object.entries(plan.present_levels.academic ?? {}).map(([k, v]) => p(`${k}: ${v}`)),
    ...Object.entries(plan.present_levels.functional ?? {}).map(([k, v]) => p(`${k}: ${v}`)),

    heading('NCCD adjustment level', HeadingLevel.HEADING_1),
    p(
      plan.nccd_adjustment_level
        ? NCCD_ADJUSTMENT_LABELS[plan.nccd_adjustment_level]
        : 'To be confirmed',
    ),
    p(plan.nccd_level_rationale ?? ''),

    heading('SMART goals', HeadingLevel.HEADING_1),
    ...(plan.goals ?? []).flatMap((g, i) => [
      p(`Goal ${i + 1} (${g.domain})`, { bold: true }),
      p(g.description),
      p(`Baseline: ${g.baseline ?? ''} · Target: ${g.target ?? ''}`),
      p(`Measure: ${g.measurement_method ?? ''}`),
    ]),

    heading('Adjustments', HeadingLevel.HEADING_1),
    ...(plan.adjustments ?? []).flatMap((a) => [
      p(IEP_SUPPORT_AREA_LABELS[a.support_area], { bold: true }),
      p(a.description),
      p(`Frequency: ${a.frequency ?? ''} · Intensity: ${a.intensity ?? ''} · Funding: ${a.funding_source}`),
    ]),

    heading('Monitoring and review', HeadingLevel.HEADING_1),
    p(plan.monitoring_plan.review_schedule ?? ''),
    p(plan.monitoring_plan.data_collection_method ?? ''),
    p(censusNote, { bold: true }),

    heading('Consultation', HeadingLevel.HEADING_1),
    p(plan.consultation_notes ?? ''),
    p(`Parent/carer goals: ${plan.parent_carer_goals ?? ''}`),
    ...(plan.team_members ?? []).map((m) => p(`${m.name} — ${m.role}${m.organisation ? ` (${m.organisation})` : ''}`)),

    heading('Professional sign-off', HeadingLevel.HEADING_1),
    p('Reviewed by: _________________________________'),
    p(`Role: ${plan.reviewer_role ?? 'Support Coordinator / Teacher / Allied Health'}`),
    p(`Date: ${plan.reviewed_at ? new Date(plan.reviewed_at).toLocaleDateString('en-AU') : '_______________'}`),
  ]

  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: AI_WATERMARK, italics: true, size: 18 })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Generated ${new Date(plan.updated_at).toLocaleDateString('en-AU')} · Sage IEP Generator · ${AI_WATERMARK}`,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        },
        children: sections,
      },
    ],
  })

  return Packer.toBuffer(doc)
}
