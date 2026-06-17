import { fetchAccreditedWaveforms } from '@/lib/operations/accredited-supplements';
import SpectrumAppClient from '@/app/spectrum/SpectrumAppClient';

export default async function SpectrumPage() {
  const accreditedWaveforms =
    process.env.SPECTRAL_ACCREDITED_RESOLVER === 'true'
      ? await fetchAccreditedWaveforms()
      : undefined;

  return <SpectrumAppClient accreditedWaveforms={accreditedWaveforms} />;
}
