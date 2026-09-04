import { describe, expect, it } from 'vitest'
import { keptImageIds, tossedImageIds } from './decisionSelectors'

describe('keep/toss selectors', () => {
  const decisions = new Map<'a' | 'b' | 'c', 'keep' | 'toss'>([
    ['a', 'keep'],
    ['b', 'toss'],
    ['c', 'keep']
  ])

  it('selects image IDs by decision in insertion order', () => {
    expect(keptImageIds(decisions)).toEqual(['a', 'c'])
    expect(tossedImageIds(decisions)).toEqual(['b'])
  })
})
