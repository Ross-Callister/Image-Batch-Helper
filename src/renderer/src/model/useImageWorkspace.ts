import { useState, useCallback, useMemo } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { useKeepTossActions } from '../features/keepToss/useKeepTossActions'
import { useRankingActions } from '../features/ranking/useRankingActions'
import { filterImagesByTags, type TagFilterMode } from '../features/tags/tagSelectors'
import { useTagActions } from '../features/tags/useTagActions'
import {
  remapImages,
  remapMap,
  remapOptionalId,
  remapSet,
  removeFromSet,
  removeImages,
  successfulRenameMap
} from './imageIdentity'
import { applyModifiedTime } from './imageMetadata'
import { sortImages } from './imageSorting'
import { createRenameRequests } from './renamePlan'
import type { ImageItem, SortField, SortDir, KeepTossDecision } from './types'

export function useImageWorkspace() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [culledIds, setCulledIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)
  const [modalImageId, setModalImageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [eloScores, setEloScores] = useState<Map<string, number>>(new Map())
  const [isRanking, setIsRanking] = useState(false)
  const [isKeepToss, setIsKeepToss] = useState(false)
  const [keepTossDecisions, setKeepTossDecisions] = useState<Map<string, KeepTossDecision>>(new Map())
  // Keys are image ids (paths); values are the working tag list (unsaved edits)
  const [draftTags, setDraftTags] = useState<Map<string, string[]>>(new Map())
  const [tagFilters, setTagFilters] = useState<Map<string, TagFilterMode>>(new Map())

  const filteredImages = useMemo(
    () => filterImagesByTags(images, draftTags, tagFilters),
    [images, tagFilters, draftTags]
  )

  const loadImages = useCallback(
    async (paths: string[]) => {
      if (culledIds.size > 0) {
        const ok = await window.api.confirm(
          `You have ${culledIds.size} image(s) marked for deletion that haven't been deleted yet. Replace all images with the new selection?`
        )
        if (!ok) return
      }

      try {
        const items = await window.api.loadImages(paths)
        const newSortField: SortField = sortField === 'elo' ? 'name' : sortField
        const newSortDir: SortDir = sortField === 'elo' ? 'asc' : sortDir
        const sorted = sortImages(items, newSortField, newSortDir)
        setImages(sorted)
        setSelectedIds(new Set())
        setCulledIds(new Set())
        setLastClickedId(null)
        setModalImageId(null)
        setEloScores(new Map())
        setDraftTags(new Map())
        setTagFilters(new Map())
        setKeepTossDecisions(new Map())
        setIsKeepToss(false)
        setSortField(newSortField)
        setSortDir(newSortDir)
        setError(null)
      } catch {
        setError('Failed to load images.')
      }
    },
    [culledIds.size, sortField, sortDir]
  )

  const handleImageClick = useCallback(
    (id: string, ctrlKey: boolean, shiftKey: boolean) => {
      setSelectedIds((prev) => {
        if (shiftKey && lastClickedId) {
          const ids = filteredImages.map((i) => i.id)
          const a = ids.indexOf(lastClickedId)
          const b = ids.indexOf(id)
          if (a !== -1 && b !== -1) {
            const [lo, hi] = a < b ? [a, b] : [b, a]
            const range = new Set(ids.slice(lo, hi + 1))
            const next = new Set(prev)
            range.forEach((rid) => next.add(rid))
            return next
          }
        }
        if (ctrlKey) {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        }
        return new Set([id])
      })
      setLastClickedId(id)
    },
    [filteredImages, lastClickedId]
  )

  const openModal = useCallback((id: string) => {
    setModalImageId(id)
  }, [])

  const closeModal = useCallback(() => {
    setModalImageId(null)
  }, [])

  const navigateModal = useCallback(
    (dir: 'prev' | 'next') => {
      if (!modalImageId) return
      const idx = filteredImages.findIndex((i) => i.id === modalImageId)
      if (idx === -1) return
      const next = dir === 'prev' ? idx - 1 : idx + 1
      if (next >= 0 && next < filteredImages.length) {
        setModalImageId(filteredImages[next].id)
      }
    },
    [filteredImages, modalImageId]
  )

  const setSort = useCallback(
    (field: SortField) => {
      if (field === 'custom') {
        setSortField('custom')
        return
      }
      if (sortField === field) {
        const newDir: SortDir = sortDir === 'asc' ? 'desc' : 'asc'
        setSortDir(newDir)
        setImages((prev) => sortImages(prev, field, newDir, eloScores))
      } else {
        setSortField(field)
        setSortDir(field === 'elo' ? 'desc' : 'asc')
        const newDir: SortDir = field === 'elo' ? 'desc' : 'asc'
        setImages((prev) => sortImages(prev, field, newDir, eloScores))
      }
    },
    [sortField, sortDir, eloScores]
  )

  const reorderImages = useCallback((activeId: string, overId: string) => {
    setImages((prev) => {
      const oldIdx = prev.findIndex((i) => i.id === activeId)
      const newIdx = prev.findIndex((i) => i.id === overId)
      if (oldIdx === -1 || newIdx === -1) return prev
      return arrayMove(prev, oldIdx, newIdx)
    })
  }, [])

  const cullSelected = useCallback(() => {
    setCulledIds((prev) => {
      const next = new Set(prev)
      selectedIds.forEach((id) => next.add(id))
      return next
    })
  }, [selectedIds])

  const uncullSelected = useCallback(() => {
    setCulledIds((prev) => {
      const next = new Set(prev)
      selectedIds.forEach((id) => next.delete(id))
      return next
    })
  }, [selectedIds])

  const confirmDelete = useCallback(async () => {
    if (culledIds.size === 0) return
    setIsWorking(true)
    try {
      const paths = [...culledIds]
      const result = await window.api.trashImages(paths)
      const deleted = new Set(paths.filter((p) => !result.errors.includes(p)))
      setImages((prev) => removeImages(prev, deleted))
      setCulledIds((prev) => removeFromSet(prev, deleted))
      setSelectedIds((prev) => removeFromSet(prev, deleted))
      if (!result.ok) {
        setError(`Failed to delete ${result.errors.length} file(s). They remain marked.`)
      }
    } catch {
      setError('Failed to move files to recycle bin.')
    } finally {
      setIsWorking(false)
    }
  }, [culledIds])

  const touchAll = useCallback(async () => {
    if (filteredImages.length === 0) return
    setIsWorking(true)
    try {
      const paths = filteredImages.map((i) => i.path)
      const result = await window.api.touchImages(paths)
      const now = Date.now()
      setImages((prev) => applyModifiedTime(prev, paths, now))
      if (!result.ok) {
        setError(`Failed to touch ${result.errors.length} file(s).`)
      }
    } catch {
      setError('Failed to touch files.')
    } finally {
      setIsWorking(false)
    }
  }, [filteredImages])

  const clearView = useCallback(() => {
    setImages([])
    setSelectedIds(new Set())
    setCulledIds(new Set())
    setLastClickedId(null)
    setModalImageId(null)
    setEloScores(new Map())
    setDraftTags(new Map())
    setTagFilters(new Map())
    setKeepTossDecisions(new Map())
    setIsKeepToss(false)
    setSortField('name')
    setSortDir('asc')
    setError(null)
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredImages.map((i) => i.id)))
  }, [filteredImages])

  const selectNone = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const rankingActions = useRankingActions({
    filteredImages,
    eloScores,
    setImages,
    setEloScores,
    setIsRanking,
    setSortField,
    setSortDir
  })

  const keepTossActions = useKeepTossActions({
    decisions: keepTossDecisions,
    setImages,
    setSelectedIds,
    setDecisions: setKeepTossDecisions,
    setIsKeepToss,
    setIsWorking,
    setError
  })

  const tagActions = useTagActions({
    images,
    selectedIds,
    draftTags,
    setImages,
    setDraftTags,
    setTagFilters,
    setIsWorking,
    setError
  })

  const renameAll = useCallback(
    async (baseName: string) => {
      if (filteredImages.length === 0 || !baseName.trim()) return
      setIsWorking(true)
      try {
        const count = filteredImages.length
        const renames = createRenameRequests(filteredImages, baseName)
        const results = await window.api.renameImages(renames)
        const pathChanges = successfulRenameMap(results)

        setImages((prev) => remapImages(prev, pathChanges))
        setSelectedIds((prev) => remapSet(prev, pathChanges))
        setCulledIds((prev) => remapSet(prev, pathChanges))
        setEloScores((prev) => remapMap(prev, pathChanges))
        setDraftTags((prev) => remapMap(prev, pathChanges))
        setKeepTossDecisions((prev) => remapMap(prev, pathChanges))
        setModalImageId((prev) => remapOptionalId(prev, pathChanges))

        const failures = results.filter((r) => !r.ok)
        if (failures.length > 0) {
          setError(`Failed to rename ${failures.length} of ${count} file(s).`)
        }
      } catch {
        setError('Failed to rename files.')
      } finally {
        setIsWorking(false)
      }
    },
    [filteredImages]
  )

  return {
    images,
    selectedIds,
    culledIds,
    sortField,
    sortDir,
    modalImageId,
    error,
    isWorking,
    eloScores,
    isRanking,
    loadImages,
    handleImageClick,
    openModal,
    closeModal,
    navigateModal,
    setSort,
    reorderImages,
    cullSelected,
    uncullSelected,
    confirmDelete,
    touchAll,
    clearView,
    dismissError,
    selectAll,
    selectNone,
    ...rankingActions,
    isKeepToss,
    keepTossDecisions,
    ...keepTossActions,
    renameAll,
    draftTags,
    hasPendingTags: draftTags.size > 0,
    ...tagActions,
    filteredImages,
    tagFilters
  }
}
