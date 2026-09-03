'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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

export function ModuleCard({
  href,
  icon: iconName,
  kicker,
  title,
  blurb,
  count,
  unit,
  accentClass,
  index = 0,
}: ModuleCardProps) {
  const router = useRouter()
  const Icon = MODULE_ICONS[iconName]

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.035, 0.35),
        duration: 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -4 }}
      className="store-panel rounded-xl overflow-hidden flex flex-col cursor-pointer"
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(href)
      }}
      role="link"
      tabIndex={0}
    >
      <div className="relative aspect-[4/3] store-panel-inner rounded-none border-0 border-b border-[var(--store-line)] flex items-center justify-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 110%, rgba(249,115,22,0.12), transparent 65%)',
          }}
        />
        <div
          className={cn(
            'relative w-16 h-16 rounded-2xl border flex items-center justify-center',
            accentClass,
          )}
        >
          <Icon size={28} />
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="text-[10.5px] font-semibold tracking-widest uppercase store-text-muted">
          {kicker}
        </div>
        <h3 className="font-semibold text-[15px] leading-snug text-white">
          <Link href={href} onClick={(e) => e.stopPropagation()} className="hover:underline">
            {title}
          </Link>
        </h3>
        <p className="text-[13px] leading-relaxed line-clamp-2 store-text-body">{blurb}</p>
        <p className="font-mono text-sm mt-auto pt-2 tabular-nums">
          <span className="text-[var(--store-accent)] font-bold">{count}</span>{' '}
          <span className="store-text-muted text-xs">{unit}</span>
        </p>
      </div>
    </motion.article>
  )
}
