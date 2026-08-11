'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IepConsentGate } from '@/components/iep/IepConsentGate'
import { StorePanel } from '@/components/ui/store-surface'
import { stateSelectOptions } from '@/lib/iep/state-labels'
import type { AustralianState, PresentLevels } from '@/lib/iep/types'

interface TeamMemberDraft {
  name: string
  role: string
  organisation: string
  contact: string
}

interface IepIntakeFormProps {
  participantId: string
  participantName: string
  forceReconsent?: boolean
}

export function IepIntakeForm({ participantId, participantName, forceReconsent }: IepIntakeFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [stateTerritory, setStateTerritory] = useState<AustralianState>('NSW')
  const [schoolName, setSchoolName] = useState('')
  const [schoolContact, setSchoolContact] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [classroomTeacher, setClassroomTeacher] = useState('')
  const [academicNotes, setAcademicNotes] = useState('')
  const [functionalNotes, setFunctionalNotes] = useState('')
  const [parentCarerGoals, setParentCarerGoals] = useState('')
  const [studentVoice, setStudentVoice] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMemberDraft[]>([
    { name: '', role: 'Support Coordinator', organisation: '', contact: '' },
  ])
  const [consentReady, setConsentReady] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [parentCarerName, setParentCarerName] = useState('')
  const [under15Assent, setUnder15Assent] = useState(false)

  const presentLevels: PresentLevels = {
    academic: academicNotes.trim() ? { general: academicNotes.trim() } : {},
    functional: functionalNotes.trim() ? { general: functionalNotes.trim() } : {},
    summary: functionalNotes.trim() || undefined,
  }

  async function handleGenerate() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/app/iep/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          stateTerritory,
          schoolName,
          schoolContact,
          yearLevel,
          classroomTeacher,
          presentLevels,
          parentCarerGoals,
          studentVoice,
          teamMembers: teamMembers.filter((m) => m.name.trim()),
          consentGranted: forceReconsent || consentChecked,
          parentCarerName: parentCarerName || undefined,
          under15AssentConfirmed: under15Assent,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Generation failed')
      router.push(`/participants/${participantId}/iep/${json.data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const steps = ['School', 'Present levels', 'Goals & voice', 'Team', 'Consent & generate']

  return (
    <div className="max-w-2xl">
      <p className="text-sm store-text-body mb-4">
        Generate NCCD-compliant school plan for <strong className="text-white">{participantName}</strong>
      </p>
      <div className="flex gap-2 mb-6 flex-wrap">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`text-[10px] font-mono px-2 py-1 rounded-lg border ${
              step === i
                ? 'border-[var(--store-accent-border)] text-[var(--store-accent)]'
                : 'border-[var(--store-line)] store-text-muted'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <StorePanel className="p-4 space-y-3">
          <label className="block text-xs store-text-muted">State / territory</label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
            value={stateTerritory}
            onChange={(e) => setStateTerritory(e.target.value as AustralianState)}
          >
            {stateSelectOptions().map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
            placeholder="School name"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
          />
          <input
            className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
            placeholder="School contact"
            value={schoolContact}
            onChange={(e) => setSchoolContact(e.target.value)}
          />
          <input
            className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
            placeholder="Year level"
            value={yearLevel}
            onChange={(e) => setYearLevel(e.target.value)}
          />
          <input
            className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
            placeholder="Classroom teacher"
            value={classroomTeacher}
            onChange={(e) => setClassroomTeacher(e.target.value)}
          />
        </StorePanel>
      )}

      {step === 1 && (
        <StorePanel className="p-4 space-y-3">
          <p className="text-xs store-text-muted">
            Enter academic performance if known. Leave blank and AI will insert [REQUIRES TEACHER INPUT].
          </p>
          <textarea
            className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white min-h-[100px]"
            placeholder="Academic performance (reading, numeracy, NAPLAN, grades…)"
            value={academicNotes}
            onChange={(e) => setAcademicNotes(e.target.value)}
          />
          <textarea
            className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white min-h-[100px]"
            placeholder="Functional present levels (pre-filled from Sage where available)"
            value={functionalNotes}
            onChange={(e) => setFunctionalNotes(e.target.value)}
          />
        </StorePanel>
      )}

      {step === 2 && (
        <StorePanel className="p-4 space-y-3">
          <textarea
            className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white min-h-[80px]"
            placeholder="Parent/carer goals for school"
            value={parentCarerGoals}
            onChange={(e) => setParentCarerGoals(e.target.value)}
          />
          <textarea
            className="w-full px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white min-h-[80px]"
            placeholder="Student voice (optional)"
            value={studentVoice}
            onChange={(e) => setStudentVoice(e.target.value)}
          />
        </StorePanel>
      )}

      {step === 3 && (
        <StorePanel className="p-4 space-y-3">
          {teamMembers.map((m, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-2">
              <input
                className="px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
                placeholder="Name"
                value={m.name}
                onChange={(e) => {
                  const next = [...teamMembers]
                  next[i] = { ...m, name: e.target.value }
                  setTeamMembers(next)
                }}
              />
              <input
                className="px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
                placeholder="Role"
                value={m.role}
                onChange={(e) => {
                  const next = [...teamMembers]
                  next[i] = { ...m, role: e.target.value }
                  setTeamMembers(next)
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-cyan"
            onClick={() =>
              setTeamMembers([...teamMembers, { name: '', role: '', organisation: '', contact: '' }])
            }
          >
            + Add team member
          </button>
        </StorePanel>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <IepConsentGate
            participantId={participantId}
            onConsentReady={setConsentReady}
            parentCarerName={parentCarerName}
            onParentCarerNameChange={setParentCarerName}
            consentChecked={consentChecked}
            onConsentCheckedChange={setConsentChecked}
            under15AssentConfirmed={under15Assent}
            onUnder15AssentChange={setUnder15Assent}
          />
          {error && <p className="text-sm text-red">{error}</p>}
          <button
            type="button"
            disabled={submitting || (!consentReady && !consentChecked)}
            onClick={handleGenerate}
            className="store-btn-primary px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Generating draft…' : 'Generate AI draft'}
          </button>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="text-sm store-text-muted disabled:opacity-40"
        >
          Back
        </button>
        {step < 4 && (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="text-sm text-[var(--store-accent)]"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
