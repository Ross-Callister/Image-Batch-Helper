export const ELO_DEFAULT = 1000

const ELO_K = 64
const ELO_MIN = 100
const ELO_MAX = 3000

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export function updateEloScores(
  scores: Map<string, number>,
  aId: string,
  bId: string,
  scoreA: number
): Map<string, number> {
  const ratingA = scores.get(aId) ?? ELO_DEFAULT
  const ratingB = scores.get(bId) ?? ELO_DEFAULT
  const scoreB = 1 - scoreA
  const next = new Map(scores)

  next.set(
    aId,
    Math.min(ELO_MAX, Math.max(ELO_MIN, Math.round(ratingA + ELO_K * (scoreA - expectedScore(ratingA, ratingB)))))
  )
  next.set(
    bId,
    Math.min(ELO_MAX, Math.max(ELO_MIN, Math.round(ratingB + ELO_K * (scoreB - expectedScore(ratingB, ratingA)))))
  )

  return next
}
