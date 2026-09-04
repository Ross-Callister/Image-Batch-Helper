import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRankingPairs } from './rankingPairs'

afterEach(() => vi.restoreAllMocks())

describe('ranking pairs', () => {
  it('creates every unique pair', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const pairs = createRankingPairs(['a', 'b', 'c'])
    expect(pairs).toHaveLength(3)
    expect(new Set(pairs.map((pair) => pair.slice().sort().join(':')))).toEqual(new Set(['a:b', 'a:c', 'b:c']))
  })
})
