import { describe, expect, it } from 'vitest'
import { dedupeSystems } from '@/lib/defeat/dedupe-systems'
import type { AntiDroneSystem, DefeatEffectiveness } from '@/lib/types'

const sys = (id: string, name: string) => ({ id, name, defeat_method: ['laser'] } as unknown as AntiDroneSystem)
const eff = (platform_id: string, defeat_system_id: string, dew_pct = 50) =>
  ({ id: `${platform_id}-${defeat_system_id}`, platform_id, defeat_system_id, dew_pct } as unknown as DefeatEffectiveness)

describe('duplicate catalogue systems', () => {
  it('keeps the row with more findings and moves the other row\'s findings onto it', () => {
    const { systems, effectiveness } = dedupeSystems(
      [sys('dragonfire', 'MBDA DragonFire'), sys('dragonfire-uk', 'MBDA DragonFire (UK)'), sys('iron-beam', 'Iron Beam')],
      [eff('a', 'dragonfire-uk'), eff('b', 'dragonfire-uk'), eff('d', 'dragonfire-uk'), eff('c', 'dragonfire'), eff('a', 'dragonfire', 10)],
    )
    expect(systems.map((s) => s.id)).toEqual(['dragonfire-uk', 'iron-beam'])
    const onKept = effectiveness.filter((e) => e.defeat_system_id === 'dragonfire-uk')
    expect(onKept.map((e) => e.platform_id).sort()).toEqual(['a', 'b', 'c', 'd'])
    // The kept row's own finding for platform a wins over the duplicate's.
    expect(onKept.find((e) => e.platform_id === 'a')?.dew_pct).toBe(50)
  })

  it('leaves distinct systems alone', () => {
    const input = [sys('x', 'EOS Slinger'), sys('y', 'Iron Beam')]
    expect(dedupeSystems(input, []).systems).toEqual(input)
  })
})
