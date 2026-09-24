import { GnssIntelClient } from '@/components/gnss/GnssIntelClient'
import {
  fetchGnssConstellations,
  fetchGnssJammingIncidents,
  fetchGnssPlatformDependencies,
} from '@/lib/gnss/gnss-queries'
import { getGnssJammers } from '@/lib/gnss/queries'

export default async function GnssPage() {
  const [constellations, dependencies, incidents, jammers] = await Promise.all([
    fetchGnssConstellations(),
    fetchGnssPlatformDependencies(),
    fetchGnssJammingIncidents(),
    getGnssJammers().catch(() => []),
  ])

  return (
    <div className="max-w-[100rem] mx-auto">
      <header>
        <h1 className="page-title m-0">GNSS Intelligence</h1>
        <p className="page-lede">
          Constellation health, which platforms lose navigation when GNSS is denied, and where jamming and spoofing have been
          recorded. Evidence-graded OSINT.
        </p>
      </header>
      <GnssIntelClient
        constellations={constellations}
        dependencies={dependencies}
        incidents={incidents}
        jammers={jammers}
      />
    </div>
  )
}
