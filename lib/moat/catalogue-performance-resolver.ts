/**
 * Training-tier catalogue performance resolver — OSINT fields from platform-performance-view.
 */

import {
  resolvePlatformPerformanceView,
  type PlatformPerformanceView,
} from '@/lib/pcm/platform-performance-view';
import type { PlatformPerformance, PlatformPerformanceResolver } from '@/lib/moat/sovereignData';

function viewToPerformance(view: PlatformPerformanceView): PlatformPerformance {
  return {
    platform_id: view.platformId,
    resolved: true,
    note: view.spectrum_capabilities_summary,
    name: view.name,
    rcs_class: view.rcs_class,
    sensor_detection_range_km: view.sensor_detection_range_km,
    defeat_matrix_pk: view.defeat_matrix_pk,
    confidence: view.confidence,
    source_notes: view.source_notes,
  };
}

export const trainingCataloguePerformanceResolver: PlatformPerformanceResolver = {
  resolvePerformance(platformId: string) {
    const view = resolvePlatformPerformanceView(platformId);
    return viewToPerformance(view);
  },
};

export const openBuildPerformanceResolver: PlatformPerformanceResolver = {
  resolvePerformance(platformId: string): PlatformPerformance {
    return {
      platform_id: platformId,
      resolved: false,
      note: 'Performance data resides in the accredited catalogue. Implement resolver in the accredited environment under export-control review.',
    };
  },
};

export function getActivePerformanceResolver(): PlatformPerformanceResolver {
  if (process.env.SPECTRAL_ACCREDITED_RESOLVER === 'true') {
    return trainingCataloguePerformanceResolver;
  }
  return openBuildPerformanceResolver;
}
