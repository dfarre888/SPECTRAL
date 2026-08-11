'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'
import type { ParticipantRow } from '@/lib/iep/types'

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/app/participants')
      const json = await res.json()
      setParticipants(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function createParticipant(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/app/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name.trim() }),
      })
      if (res.ok) {
        setName('')
        await load()
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <HubPageShell
      eyebrow="Sage"
      title="Participants"
      subtitle="NDIS participants — school IEP generation"
    >
      <form onSubmit={createParticipant} className="flex gap-2 mb-6 max-w-md">
        <input
          className="flex-1 px-3 py-2 rounded-lg bg-[var(--store-surface-2)] border border-[var(--store-line)] text-sm text-white"
          placeholder="New participant full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" disabled={creating} className="store-btn-primary px-4 py-2 rounded-xl text-xs">
          Add
        </button>
      </form>

      {loading ? (
        <StorePanel className="p-6 animate-pulse h-24">
          <span className="sr-only">Loading</span>
        </StorePanel>
      ) : participants.length === 0 ? (
        <StorePanel className="p-6">
          <p className="text-sm store-text-muted">No participants yet. Add one to generate a school IEP.</p>
        </StorePanel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {participants.map((p) => (
            <Link key={p.id} href={`/participants/${p.id}`}>
              <StorePanel className="p-4 hover:border-[var(--store-accent-border)] transition-colors">
                <p className="text-sm font-semibold text-white">{p.preferred_name ?? p.full_name}</p>
                <p className="text-xs store-text-muted mt-1">{p.primary_disability ?? 'Disability not set'}</p>
              </StorePanel>
            </Link>
          ))}
        </div>
      )}
    </HubPageShell>
  )
}
