'use client'

import { useState, type ReactNode } from 'react'
import { NccdLevelSelector } from '@/components/iep/NccdLevelSelector'
import { IepRedraftButton } from '@/components/iep/IepRedraftButton'
import { StorePanel } from '@/components/ui/store-surface'
import { countTeacherInputPlaceholders } from '@/lib/iep/schemas'
import type {
  IepAdjustmentRow,
  IepGoalRow,
  IepPlanRow,
  IepSupportArea,
  NccdAdjustmentLevel,
  NccdCategory,
  ReviewerRole,
} from '@/lib/iep/types'
import { IEP_SUPPORT_AREA_LABELS, REQUIRES_TEACHER_INPUT } from '@/lib/iep/types'

interface IepDraftEditorProps {
  participantId: string
  initialPlan: IepPlanRow
}

function highlightPlaceholders(text: string): ReactNode {
  if (!text.includes(REQUIRES_TEACHER_INPUT)) return text
  const parts = text.split(REQUIRES_TEACHER_INPUT)
  return parts.flatMap((part, i) =>
    i < parts.length - 1
      ? [part, <mark key={i} className="bg-amber-500/30 text-amber-200 px-0.5 rounded">{REQUIRES_TEACHER_INPUT}</mark>]
      : [part],
  )
}

export function IepDraftEditor({ participantId, initialPlan }: IepDraftEditorProps) {
  const [plan, setPlan] = useState(initialPlan)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const placeholderCount = countTeacherInputPlaceholders(plan.present_levels)

  async function save(patch: Partial<IepPlanRow> & { goals?: IepGoalRow[]; adjustments?: IepAdjustmentRow[] }) {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/app/iep/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, version: plan.version }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      setPlan(json.data)
      setMessage('Saved')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function exportDocx() {
    const res = await fetch(`/api/app/iep/${plan.id}/export`, { method: 'POST' })
    if (!res.ok) return alert('Export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${plan.document_title.replace(/\s+/g, '_')}_${plan.school_year}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function approve(reviewerRole: ReviewerRole) {
    const res = await fetch(`/api/app/iep/${plan.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerRole }),
    })
    const json = await res.json()
    if (!res.ok) return alert(json.error ?? 'Approval failed')
    setPlan(json.data)
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white store-display">{plan.document_title}</h1>
          <p className="text-xs store-text-muted font-mono">
            {plan.school_name} · Year {plan.year_level} · {plan.status}
          </p>
          <p className="text-[10px] text-amber-400/90 mt-1 font-mono italic">
            AI-Assisted Draft — For Professional Review
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <IepRedraftButton iepId={plan.id} onComplete={() => window.location.reload()} />
          <button type="button" onClick={exportDocx} className="store-btn-primary px-3 py-2 rounded-xl text-xs">
            Export DOCX
          </button>
        </div>
      </div>

      {placeholderCount > 0 && !plan.placeholders_acknowledged && (
        <StorePanel className="p-3 border-amber-500/40 bg-amber-500/5">
          <p className="text-xs text-amber-200">
            {placeholderCount} field(s) require teacher input before sign-off.
          </p>
          <label className="flex items-center gap-2 mt-2 text-xs store-text-body cursor-pointer">
            <input
              type="checkbox"
              onChange={(e) => save({ placeholders_acknowledged: e.target.checked })}
            />
            Acknowledge placeholders — coordinator confirms teacher will complete
          </label>
        </StorePanel>
      )}

      <StorePanel className="p-4">
        <h2 className="text-sm font-semibold text-white mb-2">Student profile</h2>
        <textarea
          className="w-full min-h-[100px] px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
          value={plan.student_profile.functional_impact ?? ''}
          onChange={(e) =>
            setPlan({
              ...plan,
              student_profile: { ...plan.student_profile, functional_impact: e.target.value },
            })
          }
          onBlur={() => save({ student_profile: plan.student_profile })}
        />
        <p className="text-xs store-text-muted mt-2">{plan.student_profile.ndis_school_interface_note}</p>
      </StorePanel>

      <StorePanel className="p-4">
        <h2 className="text-sm font-semibold text-white mb-2">Present levels</h2>
        <p className="text-sm store-text-body whitespace-pre-wrap">
          {highlightPlaceholders(plan.present_levels.summary ?? JSON.stringify(plan.present_levels.academic, null, 2))}
        </p>
      </StorePanel>

      <StorePanel className="p-4">
        <h2 className="text-sm font-semibold text-white mb-3">NCCD classification</h2>
        <NccdLevelSelector
          level={plan.nccd_adjustment_level}
          category={plan.nccd_category}
          rationale={plan.nccd_level_rationale}
          onLevelChange={(v) => {
            setPlan({ ...plan, nccd_adjustment_level: v })
            save({ nccd_adjustment_level: v })
          }}
          onCategoryChange={(v) => {
            setPlan({ ...plan, nccd_category: v })
            save({ nccd_category: v })
          }}
          onRationaleChange={(v) => setPlan({ ...plan, nccd_level_rationale: v })}
        />
        <button
          type="button"
          className="mt-2 text-xs text-cyan"
          onClick={() => save({ nccd_level_rationale: plan.nccd_level_rationale })}
        >
          Save rationale
        </button>
      </StorePanel>

      <StorePanel className="p-4">
        <h2 className="text-sm font-semibold text-white mb-2">SMART goals</h2>
        <div className="space-y-3">
          {(plan.goals ?? []).map((g, i) => (
            <div key={g.id ?? i} className="p-3 rounded-lg bg-[var(--store-surface-2)]">
              <input
                className="w-full bg-transparent text-sm text-white mb-1"
                value={g.description}
                onChange={(e) => {
                  const goals = [...(plan.goals ?? [])]
                  goals[i] = { ...g, description: e.target.value }
                  setPlan({ ...plan, goals })
                }}
                onBlur={() => save({ goals: plan.goals })}
              />
              <p className="text-[10px] store-text-muted font-mono">
                Target: {g.target} · Baseline: {g.baseline}
              </p>
            </div>
          ))}
        </div>
      </StorePanel>

      <StorePanel className="p-4">
        <h2 className="text-sm font-semibold text-white mb-2">Adjustments</h2>
        <div className="space-y-2">
          {(plan.adjustments ?? []).map((a, i) => (
            <div key={a.id ?? i} className="text-sm store-text-body border-l-2 border-[var(--store-accent)] pl-3">
              <p className="text-[10px] font-mono text-[var(--store-accent)]">
                {IEP_SUPPORT_AREA_LABELS[a.support_area as IepSupportArea]} · {a.funding_source}
              </p>
              <p>{a.description}</p>
            </div>
          ))}
        </div>
      </StorePanel>

      <StorePanel className="p-4">
        <h2 className="text-sm font-semibold text-white mb-2">Monitoring & review</h2>
        <p className="text-sm store-text-body">{plan.monitoring_plan.review_schedule}</p>
        <p className="text-sm store-text-body mt-2">{plan.monitoring_plan.data_collection_method}</p>
        <div className="mt-3 p-3 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)]">
          <p className="text-[10px] font-mono store-text-muted mb-1">NCCD census evidence (read-only)</p>
          <p className="text-xs text-white font-mono">{plan.monitoring_plan.census_evidence_note}</p>
        </div>
      </StorePanel>

      <StorePanel className="p-4">
        <h2 className="text-sm font-semibold text-white mb-2">Consultation</h2>
        <textarea
          className="w-full min-h-[60px] px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
          value={plan.consultation_notes ?? ''}
          onChange={(e) => setPlan({ ...plan, consultation_notes: e.target.value })}
          onBlur={() => save({ consultation_notes: plan.consultation_notes })}
        />
        <ul className="mt-2 text-xs store-text-muted">
          {(plan.team_members ?? []).map((m) => (
            <li key={m.id}>{m.name} — {m.role}</li>
          ))}
        </ul>
      </StorePanel>

      <div className="fixed bottom-0 left-0 right-0 md:left-72 xl:left-80 p-4 bg-[var(--store-surface)] border-t border-[var(--store-line)] flex flex-wrap gap-2 z-30">
        <button
          type="button"
          disabled={saving}
          onClick={() => save({})}
          className="px-4 py-2 rounded-xl border border-[var(--store-line)] text-xs store-text-body"
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button
          type="button"
          onClick={() =>
            fetch(`/api/app/iep/${plan.id}/approve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ submitForReview: true }),
            }).then(() => window.location.reload())
          }
          className="px-4 py-2 rounded-xl border border-cyan/40 text-xs text-cyan"
        >
          Submit for review
        </button>
        <button
          type="button"
          onClick={() => approve('coordinator')}
          className="store-btn-primary px-4 py-2 rounded-xl text-xs"
        >
          Approve & sign off
        </button>
        {message && <span className="text-xs store-text-muted self-center">{message}</span>}
      </div>
    </div>
  )
}
