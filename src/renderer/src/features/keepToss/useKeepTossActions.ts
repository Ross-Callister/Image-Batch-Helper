import { useCallback, type Dispatch, type SetStateAction } from 'react'
import {
  remapImages,
  remapSet,
  removeFromMap,
  removeFromSet,
  removeImages,
  type PathChange
} from '../../model/imageIdentity'
import type { ImageItem, KeepTossDecision } from '../../model/types'
import { keptImageIds, tossedImageIds } from './decisionSelectors'

interface KeepTossActionDependencies {
  decisions: Map<string, KeepTossDecision>
  setImages: Dispatch<SetStateAction<ImageItem[]>>
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>
  setDecisions: Dispatch<SetStateAction<Map<string, KeepTossDecision>>>
  setIsKeepToss: Dispatch<SetStateAction<boolean>>
  setIsWorking: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
}

export function useKeepTossActions({
  decisions,
  setImages,
  setSelectedIds,
  setDecisions,
  setIsKeepToss,
  setIsWorking,
  setError
}: KeepTossActionDependencies) {
  const startKeepToss = useCallback(() => setIsKeepToss(true), [setIsKeepToss])
  const stopKeepToss = useCallback(() => setIsKeepToss(false), [setIsKeepToss])

  const decideKeepToss = useCallback(
    (id: string, decision: KeepTossDecision) => {
      setDecisions((previous) => new Map(previous).set(id, decision))
    },
    [setDecisions]
  )

  const undoKeepToss = useCallback(
    (id: string) => {
      setDecisions((previous) => {
        const next = new Map(previous)
        next.delete(id)
        return next
      })
    },
    [setDecisions]
  )

  const resetKeepToss = useCallback(() => setDecisions(new Map()), [setDecisions])

  const deleteTossed = useCallback(async () => {
    const tossedIds = tossedImageIds(decisions)
    if (tossedIds.length === 0) return
    setIsWorking(true)
    try {
      const result = await window.api.trashImages(tossedIds)
      const deleted = new Set(tossedIds.filter((path) => !result.errors.includes(path)))
      setImages((previous) => removeImages(previous, deleted))
      setDecisions((previous) => removeFromMap(previous, deleted))
      setSelectedIds((previous) => removeFromSet(previous, deleted))
      if (!result.ok) {
        setError(`Failed to delete ${result.errors.length} file(s). They remain marked.`)
      }
    } catch {
      setError('Failed to move files to recycle bin.')
    } finally {
      setIsWorking(false)
    }
  }, [decisions, setDecisions, setError, setImages, setIsWorking, setSelectedIds])

  const moveKept = useCallback(
    async (destinationFolder: string) => {
      const keptIds = keptImageIds(decisions)
      if (keptIds.length === 0 || !destinationFolder.trim()) return
      setIsWorking(true)
      try {
        const result = await window.api.moveImages(keptIds, destinationFolder.trim())
        const movedPaths = new Map<string, PathChange>(
          result.moved.map(({ oldPath, newPath }) => [oldPath, { newPath }])
        )
        setImages((previous) => remapImages(previous, movedPaths))
        setDecisions((previous) => removeFromMap(previous, new Set(movedPaths.keys())))
        setSelectedIds((previous) => remapSet(previous, movedPaths))
        if (!result.ok) setError(`Failed to move ${result.errors.length} file(s).`)
      } catch {
        setError('Failed to move files.')
      } finally {
        setIsWorking(false)
      }
    },
    [decisions, setDecisions, setError, setImages, setIsWorking, setSelectedIds]
  )

  return {
    startKeepToss,
    stopKeepToss,
    decideKeepToss,
    undoKeepToss,
    resetKeepToss,
    deleteTossed,
    moveKept
  }
}
