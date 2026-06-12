'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const MAX_COMPARE = 4

interface CompareStore {
  ids: string[]
  add: (id: string) => boolean
  remove: (id: string) => void
  toggle: (id: string) => boolean
  clear: () => void
  isSelected: (id: string) => boolean
  isFull: () => boolean
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (id) => {
        const { ids } = get()
        if (ids.includes(id)) return true
        if (ids.length >= MAX_COMPARE) return false
        set({ ids: [...ids, id] })
        return true
      },
      remove: (id) => set({ ids: get().ids.filter((x) => x !== id) }),
      toggle: (id) => {
        const { ids, add, remove } = get()
        if (ids.includes(id)) {
          remove(id)
          return true
        }
        return add(id)
      },
      clear: () => set({ ids: [] }),
      isSelected: (id) => get().ids.includes(id),
      isFull: () => get().ids.length >= MAX_COMPARE,
    }),
    {
      name: 'spectral-compare',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)

export const MAX_COMPARE_PLATFORMS = MAX_COMPARE
