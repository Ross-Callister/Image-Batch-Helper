import { describe, expect, it } from 'vitest'
import { ELO_DEFAULT, updateEloScores } from './elo'

describe('Elo scoring', () => {
  it('uses the default rating and current win/draw results', () => {
    expect(updateEloScores(new Map(), 'a', 'b', 1)).toEqual(new Map([['a', 1032], ['b', 968]]))
    expect(updateEloScores(new Map(), 'a', 'b', 0.5)).toEqual(
      new Map([['a', ELO_DEFAULT], ['b', ELO_DEFAULT]])
    )
  })

  it('clamps scores to the current bounds', () => {
    const scores = updateEloScores(new Map([['a', 3000], ['b', 100]]), 'a', 'b', 1)
    expect(scores.get('a')).toBe(3000)
    expect(scores.get('b')).toBe(100)
  })
})
