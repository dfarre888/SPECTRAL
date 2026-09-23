'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { MODULE_ICONS } from '@/components/navigation/module-presentation'
import type { ModuleIconName } from '@/lib/navigation/modules'

export type { ModuleIconName }

interface ModuleCardProps {
  href: string
  icon: ModuleIconName
  kicker: string
  title: string
  blurb: string
  count: string
  unit: string
  accentClass: string
  index?: number
}

/**
 * One module in the catalogue. The whole card is the link; content is
 * visible at rest (no entrance animation gating it), and the hover is a
 * hairline lift, not a jump.
 */
export function ModuleCard({ href, icon: iconName, kicker, title, blurb, count, unit, accentClass }: ModuleCardProps) {
  const Icon = MODULE_ICONS[iconName]

  return (
    <Link
      href={href}
      className="group store-panel rounded-2xl p-5 flex flex-col gap-3 transition-[border-color,box-shadow] duration-200 hover:border-[rgba(255,255,255,0.22)] focus-visible:border-[rgba(41,151,255,0.6)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            'w-10 h-10 rounded-xl border flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
            accentClass,
          )}
          aria-hidden
        >
          <Icon size={19} strokeWidth={1.75} />
        </span>
        <span className="text-[12px] store-text-muted">{kicker}</span>
      </div>
      <div>
        <h3 className="font-semibold text-[15px] leading-snug text-[var(--store-ink)] group-hover:text-white">{title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed line-clamp-2 store-text-body">{blurb}</p>
      </div>
      <p className="mt-auto pt-1 tabular-nums">
        <span className="font-semibold store-display text-[20px] text-[var(--store-ink)]">{count}</span>{' '}
        <span className="store-text-muted text-[12px]">{unit}</span>
      </p>
    </Link>
  )
}
