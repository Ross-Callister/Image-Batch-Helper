export type RankingPair = [string, string]

export function shuffle<T>(values: T[]): T[] {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

export function createRankingPairs(ids: string[]): RankingPair[] {
  const pairs: RankingPair[] = []
  for (let left = 0; left < ids.length; left++) {
    for (let right = left + 1; right < ids.length; right++) {
      pairs.push([ids[left], ids[right]])
    }
  }
  return shuffle(pairs)
}
