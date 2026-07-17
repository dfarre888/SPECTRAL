import { describe, expect, it } from 'vitest'
import {
  entityIdFromPick,
  isMissionPathEntityId,
  uasInstanceFromMissionEntity,
} from '@/lib/map/cesium-pick'
import { missionSegmentChunkEntityId } from '@/lib/map/mission-path-planner'

describe('cesium-pick', () => {
  it('entityIdFromPick resolves entity wrapper ids', () => {
    expect(entityIdFromPick({ id: { id: 'map-uas-mark-uas-1' } })).toBe('map-uas-mark-uas-1')
    expect(entityIdFromPick({ id: 'map-cuas-mark-cuas-1' })).toBe('map-cuas-mark-cuas-1')
  })

  it('recognises mission path entity ids', () => {
    const segId = missionSegmentChunkEntityId('uas-1739123456-abcde', 1, 3)
    expect(isMissionPathEntityId(segId)).toBe(true)
    expect(uasInstanceFromMissionEntity(segId)).toBe('uas-1739123456-abcde')
  })

  it('parses waypoint entity ids with dashed uas instance ids', () => {
    const wpId = 'map-mission-wp-uas-1739123456-abcde-wp-manual-1'
    expect(isMissionPathEntityId(wpId)).toBe(true)
    expect(uasInstanceFromMissionEntity(wpId)).toBe('uas-1739123456-abcde')
  })
})
