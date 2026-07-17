import type { ConflictCaseStudy } from '@/data/seed-conflicts'
import { CASE_STUDY_INCIDENT_GEO, CASE_STUDY_REGION_ANCHOR } from '@/lib/conflicts/case-study-geo'
import { normalizeIncidentType } from '@/lib/conflicts/incident-style'
import type { ConflictIncident } from '@/lib/conflicts/types'

/** Map case-study narrative incidents to geolocated ConflictIncident rows for Cesium. */
export function caseStudyToMapIncidents(study: ConflictCaseStudy): ConflictIncident[] {
  const anchor = CASE_STUDY_REGION_ANCHOR[study.id]
  if (study.incidents.length === 0) {
    if (!anchor) return []
    return [
      {
        id: `${study.id}:region`,
        conflict_name: study.name,
        incident_title: `${study.region} — operational area`,
        incident_type: 'other',
        occurred_at: `${study.source_date}T00:00:00Z`,
        lat: anchor.lat,
        lon: anchor.lon,
        summary: study.summary,
        source_ref: study.source_date,
        platforms_involved: study.related_platform_ids,
        confidence: 'Assessed',
        classification: study.classification,
        created_at: study.source_date,
      },
    ]
  }

  return study.incidents.flatMap((inc, index) => {
    const geo = CASE_STUDY_INCIDENT_GEO[inc.id]
    const lat = geo?.lat ?? anchor?.lat
    const lon = geo?.lon ?? anchor?.lon
    if (lat == null || lon == null) return []
    const offset = index * 0.08
    return [{
      id: `${study.id}:${inc.id}`,
      conflict_name: study.name,
      incident_title: inc.title,
      incident_type: normalizeIncidentType(geo?.incident_type ?? 'strike'),
      occurred_at: `${inc.date}-01T00:00:00Z`,
      lat: lat + offset * 0.15,
      lon: lon + offset * 0.15,
      summary: inc.summary,
      source_ref: inc.sources.join('; '),
      platforms_involved: inc.platforms,
      confidence: inc.confidence,
      classification: study.classification,
      created_at: study.source_date,
    }]
  })
}

export function allCaseStudiesMapIncidents(studies: ConflictCaseStudy[]): ConflictIncident[] {
  return studies.flatMap(caseStudyToMapIncidents)
}
