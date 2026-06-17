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
      eyebrow="Navigation Warfare"
      title="GNSS Intelligence"
      subtitle="Constellation status, platform GNSS dependency, and evidence-graded jamming incident awareness — OSINT"
    >
      <GnssIntelClient
        constellations={constellations}
        dependencies={dependencies}
        incidents={incidents}
      />
    </HubPageShell>
  )
}
