'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_PILLS, type CategoryPill } from '@/lib/platforms/constants'
import { cn } from '@/lib/utils'

interface FilterBarProps {
  categoryPill: CategoryPill
  onCategoryPillChange: (pill: CategoryPill) => void
  country: string
  onCountryChange: (country: string) => void
  search: string
  onSearchChange: (search: string) => void
  countries: string[]
}

export function FilterBar({
  categoryPill,
  onCategoryPillChange,
  country,
  onCountryChange,
  search,
  onSearchChange,
  countries,
}: FilterBarProps) {
  const router = useRouter()

  const handlePillClick = (pill: CategoryPill) => {
    if (pill === 'gnss_shortcut') {
      router.push('/gnss')
      return
    }
    if (pill === 'cuas_shortcut') {
      router.push('/defeat')
      return
    }
    onCategoryPillChange(pill)
  }

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap gap-2">
        {CATEGORY_PILLS.map((pill) => (
          <Button
            key={pill.id}
            variant="outline"
            size="sm"
            onClick={() => handlePillClick(pill.id)}
            className={cn(
              categoryPill === pill.id && pill.id !== 'gnss_shortcut' && pill.id !== 'cuas_shortcut'
                ? 'border-[var(--store-accent)] text-[var(--store-accent)]'
                : 'border-[var(--store-line)] store-text-body'
            )}
          >
            {pill.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 store-text-muted" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search platforms..."
            className="pl-9"
          />
        </div>

        <Select value={country} onValueChange={onCountryChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
