import { MainShell } from '@/components/layout/MainShell'
import { fetchProposedCurrencyCount } from '@/lib/currency/currency-queries'
import { getPlatformCount } from '@/lib/platforms/queries'

export default async function SpectrumLayout({ children }: { children: React.ReactNode }) {
  let proposedCurrencyCount = 0
  let platformCount = 0
  try {
    proposedCurrencyCount = await fetchProposedCurrencyCount()
  } catch {
    proposedCurrencyCount = 0
  }
  try {
    platformCount = await getPlatformCount()
  } catch {
    platformCount = 0
  }

  return (
    <MainShell
      proposedCurrencyCount={proposedCurrencyCount}
      platformCount={platformCount}
      fullBleed
      moduleLabel="SPECTRUM VIEW"
    >
      {children}
    </MainShell>
  )
}
