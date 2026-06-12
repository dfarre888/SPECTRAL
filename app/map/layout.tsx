import { FullBleedShell } from '@/components/layout/FullBleedShell'

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <FullBleedShell title="Map Intel">
      {children}
    </FullBleedShell>
  )
}
