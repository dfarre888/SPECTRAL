import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { fetchProposedCurrencyCount } from '@/lib/currency/currency-queries'
import { getPlatformCount } from '@/lib/platforms/queries'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
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
    <div className="flex h-[calc(100vh-20px)] hub-page-canvas">
      <Sidebar proposedCurrencyCount={proposedCurrencyCount} platformCount={platformCount} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
