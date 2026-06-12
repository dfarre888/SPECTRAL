'use client'

import { GitCompare } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { MAX_COMPARE_PLATFORMS, useCompareStore } from '@/lib/stores/compare-store'

interface CompareButtonProps {
  platformId: string
}

export function CompareButton({ platformId }: CompareButtonProps) {
  const { isSelected, toggle } = useCompareStore()
  const selected = isSelected(platformId)

  const handleClick = () => {
    const ok = toggle(platformId)
    if (!ok) {
      toast.error(`Maximum ${MAX_COMPARE_PLATFORMS} platforms`)
      return
    }
    toast.success(selected ? 'Removed from compare' : 'Added to compare')
  }

  return (
    <Button variant={selected ? 'default' : 'outline'} size="sm" onClick={handleClick}>
      <GitCompare className="h-3.5 w-3.5" />
      {selected ? 'In Compare' : 'Compare'}
    </Button>
  )
}
