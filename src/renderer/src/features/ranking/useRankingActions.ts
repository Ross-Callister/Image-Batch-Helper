import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { ELO_DEFAULT, updateEloScores } from '../../model/elo'
import { sortImages } from '../../model/imageSorting'
import type { ImageItem, SortDir, SortField } from '../../model/types'

interface RankingActionDependencies {
  filteredImages: ImageItem[]
  eloScores: Map<string, number>
  setImages: Dispatch<SetStateAction<ImageItem[]>>
  setEloScores: Dispatch<SetStateAction<Map<string, number>>>
  setIsRanking: Dispatch<SetStateAction<boolean>>
  setSortField: Dispatch<SetStateAction<SortField>>
  setSortDir: Dispatch<SetStateAction<SortDir>>
}

export function useRankingActions({
  filteredImages,
  eloScores,
  setImages,
  setEloScores,
  setIsRanking,
  setSortField,
  setSortDir
}: RankingActionDependencies) {
  const startRanking = useCallback(() => {
    setEloScores((previous) => {
      const next = new Map(previous)
      filteredImages.forEach((image) => {
        if (!next.has(image.id)) next.set(image.id, ELO_DEFAULT)
      })
      return next
    })
    setIsRanking(true)
  }, [filteredImages, setEloScores, setIsRanking])

  const stopRanking = useCallback(() => setIsRanking(false), [setIsRanking])

  const recordComparison = useCallback(
    (winnerId: string, loserId: string) => {
      setEloScores((previous) => updateEloScores(previous, winnerId, loserId, 1))
    },
    [setEloScores]
  )

  const recordSkip = useCallback(
    (aId: string, bId: string) => {
      setEloScores((previous) => updateEloScores(previous, aId, bId, 0.5))
    },
    [setEloScores]
  )

  const applyEloSort = useCallback(() => {
    setSortField('elo')
    setSortDir('desc')
    setImages((previous) => sortImages(previous, 'elo', 'desc', eloScores))
  }, [eloScores, setImages, setSortDir, setSortField])

  return { startRanking, stopRanking, recordComparison, recordSkip, applyEloSort }
}
