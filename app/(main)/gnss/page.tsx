import { GnssWorkspace } from '@/components/gnss/GnssWorkspace'
import { HubPageShell } from '@/components/hub/HubPageShell'
import {
  getGnssConstellations,
  getGnssJammers,
  getNavCountermeasures,
} from '@/lib/gnss/queries'

export default async function GnssPage() {
  const [constellations, jammers, countermeasures] = await Promise.all([
    getGnssConstellations(),
    getGnssJammers(),
    getNavCountermeasures(),
  ])

  return (
    <HubPageShell
      eyebrow="Navigation Warfare"
      title="GNSS Intelligence"
      subtitle="Constellation status, jamming threats, and navigation countermeasures — OSINT seed"
    >
      <GnssWorkspace
        constellations={constellations}
        jammers={jammers}
        countermeasures={countermeasures}
      />
    </HubPageShell>
  )
}
