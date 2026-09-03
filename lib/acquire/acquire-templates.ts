/**
 * Capability Acquisition — scenario templates
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type { AcquireTemplate } from '@/lib/acquire/acquire-types'

export const ACQUIRE_TEMPLATES: AcquireTemplate[] = [
  {
    id: 'shahed-darwin',
    title: 'Close Shahed gap at Darwin',
    threat_platform_id: 'shahed-136',
    location: 'Darwin',
    base_id: 'BASE-DARWIN',
    required_effect: 'Layered C-UAS kinetic point defence against OWA saturation',
  },
]

export function getAcquireTemplate(templateId: string): AcquireTemplate {
  const template = ACQUIRE_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    throw new Error(`Unknown acquire template: ${templateId}`)
  }
  return template
}
