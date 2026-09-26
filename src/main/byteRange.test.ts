import { describe, expect, it } from 'vitest'
import { parseByteRange } from './byteRange'

describe('parseByteRange', () => {
  it('returns null when no usable range is requested', () => {
    expect(parseByteRange(null, 100)).toBeNull()
    expect(parseByteRange('bytes=-', 100)).toBeNull()
    expect(parseByteRange('bytes=0-10,20-30', 100)).toBeNull()
  })

  it('parses closed and open-ended ranges', () => {
    expect(parseByteRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 })
    expect(parseByteRange('bytes=50-', 100)).toEqual({ start: 50, end: 99 })
  })

  it('clamps the end to the file size', () => {
    expect(parseByteRange('bytes=90-500', 100)).toEqual({ start: 90, end: 99 })
  })

  it('parses suffix ranges', () => {
    expect(parseByteRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 })
    expect(parseByteRange('bytes=-500', 100)).toEqual({ start: 0, end: 99 })
  })

  it('flags ranges outside the file as unsatisfiable', () => {
    expect(parseByteRange('bytes=100-', 100)).toBe('unsatisfiable')
    expect(parseByteRange('bytes=20-10', 100)).toBe('unsatisfiable')
    expect(parseByteRange('bytes=-0', 100)).toBe('unsatisfiable')
  })
})
