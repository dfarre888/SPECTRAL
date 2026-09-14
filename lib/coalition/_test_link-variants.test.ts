import { describe, expect, it } from 'vitest'
import { VARIANT_GROUPS, variantGroup, variantLabel } from './link-variants'

describe('variantGroup', () => {
  it('returns null when variant is unknown (assume compatible)', () => {
    expect(variantGroup('link16', null)).toBeNull()
    expect(variantGroup('link16', undefined)).toBeNull()
    expect(variantGroup('link16', 'made-up')).toBeNull()
  })
  it('groups Link 22 HF and UHF legs separately', () => {
    expect(variantGroup('link22', 'link22-hf')).toBe('hf')
    expect(variantGroup('link22', 'link22-uhf')).toBe('uhf')
  })
  it('keeps MIDS-JTRS and MIDS-LVT on one Link 16 net', () => {
    expect(variantGroup('link16', 'mids-jtrs')).toBeNull()
    expect(variantGroup('link16', 'mids-jtrs')).toBe(variantGroup('link16', 'mids-lvt'))
  })
  it('every table entry has a note citing why it splits or not', () => {
    for (const v of Object.values(VARIANT_GROUPS)) expect(v.note.length).toBeGreaterThan(10)
  })
  it('labels unknown variants honestly', () => {
    expect(variantLabel('link16', null)).toBe('variant unknown')
    expect(variantLabel('link22', 'link22-hf')).toBe('Link 22 HF leg')
  })
})
