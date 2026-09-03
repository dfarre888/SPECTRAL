'use client'

import Link from 'next/link'
import type { GoNoGoStatus } from '@/lib/command/go-no-go-types'
import { StorePanel } from '@/components/ui/store-surface'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<GoNoGoStatus, string> = {
  go: 'text-[var(--store-success)] border-[rgba(74,222,128,0.25)]',
  caution: 'text-amber border-amber/25',
  no_go: 'text-red border-red/25',
}

const STATUS_LABEL: Record<GoNoGoStatus, string> = {
  go: 'GO',
  caution: 'CAUTION',
  no_go: 'NO-GO',
}

interface ReadinessTileProps {
  title: string
  status: GoNoGoStatus
  summary: string
  href?: string
  meta?: string
}

export function ReadinessTile({ title, status, summary, href, meta }: ReadinessTileProps) {
  const body = (
    <StorePanel className={cn('p-4 h-full border', STATUS_STYLES[status])}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[10px] uppercase tracking-widest store-text-muted">{title}</p>
        <span className="font-mono text-xs font-bold">{STATUS_LABEL[status]}</span>
      </div>
      <p className="text-sm text-white leading-snug">{summary}</p>
      {meta ? <p className="text-[10px] font-mono store-text-muted mt-2">{meta}</p> : null}
    </StorePanel>
  )

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {body}
      </Link>
    )
  }

  return body
}
