import type { KeepTossDecision } from '../../model/types'

function imageIdsWithDecision(
  decisions: Map<string, KeepTossDecision>,
  target: KeepTossDecision
): string[] {
  return [...decisions].filter(([, decision]) => decision === target).map(([id]) => id)
}

export function keptImageIds(decisions: Map<string, KeepTossDecision>): string[] {
  return imageIdsWithDecision(decisions, 'keep')
}

export function tossedImageIds(decisions: Map<string, KeepTossDecision>): string[] {
  return imageIdsWithDecision(decisions, 'toss')
}
