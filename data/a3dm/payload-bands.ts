/**
 * Per-payload electromagnetic / EO-IR bands (OSINT).
 * Specific SKUs first; type templates as fallback.
 * Skip parachute / FTS / speaker / spotlight / strobe / dropper / gripper / tether / beacon.
 */
import type { PayloadBandSpec } from '@/lib/a3dm/types'

const MHz = (m: number) => m * 1e6
const GHz = (g: number) => g * 1e9

const VISUAL: PayloadBandSpec = {
  axis: 'eo_ir', layer: 'eo_ir', fn: 'sensor',
  label: 'Visual / RGB', wavelength_low_um: 0.4, wavelength_high_um: 0.7,
  note: 'OSINT: silicon CMOS visible band',
}
const NIR: PayloadBandSpec = {
  axis: 'eo_ir', layer: 'eo_ir', fn: 'sensor',
  label: 'Near-IR', wavelength_low_um: 0.7, wavelength_high_um: 1.0,
  note: 'OSINT: NIR imaging / vegetation red-edge',
}
const LWIR: PayloadBandSpec = {
  axis: 'eo_ir', layer: 'eo_ir', fn: 'sensor',
  label: 'LWIR thermal', wavelength_low_um: 8, wavelength_high_um: 14,
  note: 'OSINT: uncooled microbolometer (FLIR Tau/Boson class)',
}
const MWIR: PayloadBandSpec = {
  axis: 'eo_ir', layer: 'eo_ir', fn: 'sensor',
  label: 'MWIR thermal', wavelength_low_um: 3, wavelength_high_um: 5,
  note: 'OSINT: cooled MWIR (less common on COTS gimbals)',
}
const LRF_905: PayloadBandSpec = {
  axis: 'eo_ir', layer: 'eo_ir', fn: 'laser',
  label: 'Laser rangefinder 905 nm', wavelength_low_um: 0.905, wavelength_high_um: 0.905,
  note: 'OSINT: typical COTS LRF / LiDAR class',
}
const LIDAR_905: PayloadBandSpec = {
  axis: 'eo_ir', layer: 'eo_ir', fn: 'laser',
  label: 'LiDAR 905 nm', wavelength_low_um: 0.9, wavelength_high_um: 0.91,
  note: 'OSINT: most UAV LiDAR (Velodyne/Livox/DJI L1 class)',
}
const LIDAR_1550: PayloadBandSpec = {
  axis: 'eo_ir', layer: 'eo_ir', fn: 'laser',
  label: 'LiDAR 1550 nm', wavelength_low_um: 1.53, wavelength_high_um: 1.57,
  note: 'OSINT: eye-safe 1550 nm class (RIEGL / some Hovermap)',
}
const GNSS_L1: PayloadBandSpec = {
  axis: 'gnss', layer: 'navigation', fn: 'navigation',
  label: 'GPS L1 / GNSS L1', freq_low_hz: MHz(1574.42), freq_high_hz: MHz(1576.42),
}
const GNSS_L2: PayloadBandSpec = {
  axis: 'gnss', layer: 'navigation', fn: 'navigation',
  label: 'GPS L2', freq_low_hz: MHz(1226.6), freq_high_hz: MHz(1228.6),
}
const ADSB_1090: PayloadBandSpec = {
  axis: 'rf', layer: 'comms', fn: 'telemetry',
  label: 'ADS-B 1090 MHz', freq_low_hz: MHz(1087), freq_high_hz: MHz(1093),
  note: 'OSINT: Mode-S / ADS-B Out 1090 ES',
}
const UAT_978: PayloadBandSpec = {
  axis: 'rf', layer: 'comms', fn: 'telemetry',
  label: 'UAT 978 MHz', freq_low_hz: MHz(978), freq_high_hz: MHz(979),
}
const RID_BLE: PayloadBandSpec = {
  axis: 'rf', layer: 'comms', fn: 'telemetry',
  label: 'Remote ID BLE / Wi-Fi', freq_low_hz: MHz(2400), freq_high_hz: MHz(2483.5),
  note: 'OSINT: ASTM F3411 / EU RID broadcast',
}
const MMWAVE_77: PayloadBandSpec = {
  axis: 'rf', layer: 'radar', fn: 'radar_emit',
  label: 'mmWave detect 76–81 GHz', freq_low_hz: GHz(76), freq_high_hz: GHz(81),
  note: 'OSINT: automotive-class DAA radar',
}
const X_SAR: PayloadBandSpec = {
  axis: 'rf', layer: 'radar', fn: 'radar_emit',
  label: 'X-band SAR', freq_low_hz: GHz(8), freq_high_hz: GHz(12),
}
const METHANE_IR: PayloadBandSpec = {
  axis: 'eo_ir', layer: 'eo_ir', fn: 'sensor',
  label: 'OGI / methane IR', wavelength_low_um: 3.2, wavelength_high_um: 3.4,
  note: 'OSINT: hydrocarbon absorption ~3.3 µm',
}

/** Per-SKU overrides — manufacturer-published or well-documented OSINT. */
export const PAYLOAD_BANDS_BY_ID: Record<string, PayloadBandSpec[]> = {
  'PLD-0006': [VISUAL], // Z30 zoom EO
  'PLD-0007': [LWIR], // XT Tau 2
  'PLD-0008': [VISUAL, LWIR], // XT2
  'PLD-0009': [LWIR],
  'PLD-0010': [VISUAL, LRF_905], // H20
  'PLD-0011': [VISUAL, LWIR, LRF_905], // H20T
  'PLD-0012': [VISUAL, LWIR, NIR], // H20N starlight
  'PLD-0013': [VISUAL, LRF_905],
  'PLD-0014': [VISUAL, LWIR, LRF_905], // H30T
  'PLD-0015': [LIDAR_905, VISUAL], // L1 Livox
  'PLD-0016': [LIDAR_905, VISUAL], // L2
  'PLD-0017': [VISUAL], // P1 mapping
  'PLD-0018': [LIDAR_905],
  'PLD-0019': [GNSS_L1, GNSS_L2],
  'PLD-0020': [GNSS_L1, GNSS_L2],
  'PLD-0025': [LWIR], // Boson+
  'PLD-0030': [VISUAL, LWIR],
  'PLD-0094': [LWIR, VISUAL],
  'PLD-0099': [LWIR],
  'PLD-0102': [LWIR],
  'PLD-0243': [LWIR],
  'PLD-0146': [VISUAL, LWIR], // MTS-B class
  'PLD-0147': [X_SAR],
  'PLD-0145': [X_SAR],
  'PLD-0122': [MMWAVE_77],
  'PLD-0198': [ADSB_1090],
  'PLD-0199': [ADSB_1090],
  'PLD-0200': [ADSB_1090],
  'PLD-0201': [UAT_978],
  'PLD-0202': [UAT_978, ADSB_1090],
  'PLD-0203': [RID_BLE],
  'PLD-0204': [RID_BLE],
  'PLD-0206': [RID_BLE],
  'PLD-0254': [RID_BLE],
  'PLD-0103': [METHANE_IR],
  'PLD-0113': [METHANE_IR],
  'PLD-0061': [LIDAR_1550],
  'PLD-0062': [LIDAR_1550],
  'PLD-0063': [LIDAR_1550],
  'PLD-0066': [LIDAR_1550],
}

const TYPE_FALLBACK: Record<string, PayloadBandSpec[]> = {
  'RGB Camera': [VISUAL],
  'Zoom/EO': [VISUAL],
  Thermal: [LWIR],
  Combo: [VISUAL, LWIR],
  Multispectral: [VISUAL, NIR],
  Hyperspectral: [{
    axis: 'eo_ir', layer: 'eo_ir', fn: 'sensor',
    label: 'Hyperspectral VNIR', wavelength_low_um: 0.4, wavelength_high_um: 1.0,
    note: 'OSINT: typical UAV hyperspectral VNIR cube',
  }],
  LiDAR: [LIDAR_905],
  Mapping: [VISUAL],
  'Methane/Gas': [METHANE_IR],
  Magnetometer: [],
  Radar: [MMWAVE_77],
  'ADS-B': [ADSB_1090],
  'Remote ID': [RID_BLE],
  'RTK/PPK': [GNSS_L1, GNSS_L2],
}

export function bandsForPayload(payloadId: string, type: string): PayloadBandSpec[] {
  if (PAYLOAD_BANDS_BY_ID[payloadId]) return PAYLOAD_BANDS_BY_ID[payloadId]
  return TYPE_FALLBACK[type] ?? []
}
