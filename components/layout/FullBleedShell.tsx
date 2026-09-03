import Link from 'next/link'
import { ArrowLeft, Radio } from 'lucide-react'

interface FullBleedShellProps {
  children: React.ReactNode
  title?: string
}

/**
 * Slim top bar for full-bleed routes (/map, /spectrum).
 * Same zinc tokens; no sidebar — collapsible nav lives in-page.
 */
export function FullBleedShell({ children, title }: FullBleedShellProps) {
  return (
    <div className="flex h-[calc(100vh-20px)] flex-col overflow-hidden hub-page-canvas">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-[var(--store-line)] bg-[var(--store-surface)] px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium store-text-muted transition-colors hover:bg-[var(--store-surface-2)] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          SPECTRAL
        </Link>
        <div className="h-4 w-px bg-[var(--store-line)]" />
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-purple" />
          <span className="store-display text-sm font-semibold text-white">
            {title ?? 'Full Bleed'}
          </span>
        </div>
        <div className="flex-1" />
        <span className="text-[9px] font-mono store-text-muted opacity-70">
          Powered by A3DM
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
