import { GnssWorkspace } from '@/components/gnss/GnssWorkspace'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { getGnssAnalytics, getGnssIncidents } from '@/lib/gnss/incidents'
import {
  getGnssConstellations,
  getGnssJammers,
  getNavCountermeasures,
} from '@/lib/gnss/queries'

export default async function GnssPage() {
  const [constellations, jammers, countermeasures, incidents, analytics] = await Promise.all([
    getGnssConstellations(),
    getGnssJammers(),
    getNavCountermeasures(),
    Promise.resolve(getGnssIncidents()),
    Promise.resolve(getGnssAnalytics()),
  ])

  return (
    <HubPageShell
      eyebrow="Navigation Warfare"
      title="GNSS Intelligence"
      subtitle="Constellation status, jamming threats, navigation countermeasures, and evidence-graded GNSS denial incident awareness — OSINT"
    >
      <GnssWorkspace
        constellations={constellations}
        jammers={jammers}
        countermeasures={countermeasures}
        incidents={incidents}
        analytics={analytics}
      />
    </HubPageShell>
  )
}
