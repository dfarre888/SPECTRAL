import { GnssIntelClient } from '@/components/gnss/GnssIntelClient'
import { HubPageShell } from '@/components/hub/HubPageShell'
import {
  fetchGnssConstellations,
  fetchGnssJammingIncidents,
  fetchGnssPlatformDependencies,
} from '@/lib/gnss/gnss-queries'

export default async function GnssPage() {
  const [constellations, dependencies, incidents] = await Promise.all([
    fetchGnssConstellations(),
    fetchGnssPlatformDependencies(),
    fetchGnssJammingIncidents(),
  ])

  return (
    <HubPageShell
      title="GNSS Intelligence"
      subtitle={`${constellations.length} constellations · ${dependencies.length} platform dependencies · ${incidents.length} jamming incidents, evidence-graded · OSINT`}
    >
      <GnssIntelClient
        constellations={constellations}
        dependencies={dependencies}
        incidents={incidents}
      />
    </HubPageShell>
  )
}
