import { describe, expect, it } from 'vitest'
import { parseBench, serialiseBench } from './bench-url'

const known = new Set(['A', 'B', 'C'])

describe('bench url', () => {
  it('round-trips', () => {
    expect(parseBench(serialiseBench(['B', 'A']), known)).toEqual(['B', 'A'])
  })
  it('drops unknown and duplicate ids', () => {
    expect(parseBench('A,Z,A', known)).toEqual(['A'])
  })
  it('serialises empty as null', () => {
    expect(serialiseBench([])).toBeNull()
    expect(parseBench(null, known)).toEqual([])
  })
  it('decodes url-encoded commas', () => {
    expect(parseBench('A%2CB', known)).toEqual(['A', 'B'])
  })
})
