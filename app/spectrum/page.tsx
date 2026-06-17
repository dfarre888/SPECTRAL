import { fetchAccreditedWaveforms } from '@/lib/operations/accredited-supplements';
import {
  fetchGnssConstellations,
  fetchGnssPlatformDependencies,
} from '@/lib/gnss/gnss-queries';
import SpectrumAppClient from '@/app/spectrum/SpectrumAppClient';

export default async function SpectrumPage() {
  const [accreditedWaveforms, constellations, gnssDependencies] = await Promise.all([
    process.env.SPECTRAL_ACCREDITED_RESOLVER === 'true'
      ? fetchAccreditedWaveforms()
      : Promise.resolve(undefined),
    fetchGnssConstellations(),
    fetchGnssPlatformDependencies(),
  ]);

  return (
    <SpectrumAppClient
      accreditedWaveforms={accreditedWaveforms}
      constellations={constellations}
      gnssVulnerabilities={gnssDependencies}
    />
  );
}
