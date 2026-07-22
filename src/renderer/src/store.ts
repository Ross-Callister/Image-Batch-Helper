import { useState, useCallback, useMemo } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { ImageItem, SortField, SortDir, KeepTossDecision } from './types'

const ELO_K = 64
const ELO_DEFAULT = 1000

function eloExpected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

function eloUpdate(
  scores: Map<string, number>,
  aId: string,
  bId: string,
  sA: number // 1 = A wins, 0 = B wins, 0.5 = draw
): Map<string, number> {
  const rA = scores.get(aId) ?? ELO_DEFAULT
  const rB = scores.get(bId) ?? ELO_DEFAULT
  const eA = eloExpected(rA, rB)
  const eB = eloExpected(rB, rA)
  const sB = 1 - sA
  const next = new Map(scores)
  next.set(aId, Math.min(3000, Math.max(100, Math.round(rA + ELO_K * (sA - eA)))))
  next.set(bId, Math.min(3000, Math.max(100, Math.round(rB + ELO_K * (sB - eB)))))
  return next
}

function applySort(
  images: ImageItem[],
  field: SortField,
  dir: SortDir,
  eloScores?: Map<string, number>
): ImageItem[] {
  if (field === 'custom') return images
  return [...images].sort((a, b) => {
    let cmp = 0
    if (field === 'name') cmp = a.name.localeCompare(b.name, undefined, { numeric: true })
    else if (field === 'mtime') cmp = a.mtime - b.mtime
    else if (field === 'birthtime') cmp = a.birthtime - b.birthtime
    else if (field === 'elo') {
      const sa = eloScores?.get(a.id) ?? ELO_DEFAULT
      const sb = eloScores?.get(b.id) ?? ELO_DEFAULT
      cmp = sa - sb
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

export function useImageStore() {
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
  const [tagFilters, setTagFilters] = useState<Map<string, 'include' | 'exclude'>>(new Map())

  const filteredImages = useMemo(() => {
    if (tagFilters.size === 0) return images
    return images.filter((img) => {
      const tags = draftTags.get(img.id) ?? img.tags
      for (const [tag, mode] of tagFilters) {
        if (mode === 'include' && !tags.includes(tag)) return false
        if (mode === 'exclude' && tags.includes(tag)) return false
      }
      return true
    })
  }, [images, tagFilters, draftTags])

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
        const sorted = applySort(items, newSortField, newSortDir)
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
        setImages((prev) => applySort(prev, field, newDir, eloScores))
      } else {
        setSortField(field)
        setSortDir(field === 'elo' ? 'desc' : 'asc')
        const newDir: SortDir = field === 'elo' ? 'desc' : 'asc'
        setImages((prev) => applySort(prev, field, newDir, eloScores))
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
      setImages((prev) => prev.filter((i) => !deleted.has(i.id)))
      setCulledIds((prev) => {
        const next = new Set(prev)
        deleted.forEach((p) => next.delete(p))
        return next
      })
      setSelectedIds((prev) => {
        const next = new Set(prev)
        deleted.forEach((p) => next.delete(p))
        return next
      })
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
      const touchedSet = new Set(paths)
      setImages((prev) => prev.map((i) => (touchedSet.has(i.path) ? { ...i, mtime: now } : i)))
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

  // ELO ranking actions
  const startRanking = useCallback(() => {
    setEloScores((prev) => {
      const next = new Map(prev)
      filteredImages.forEach((img) => {
        if (!next.has(img.id)) next.set(img.id, ELO_DEFAULT)
      })
      return next
    })
    setIsRanking(true)
  }, [filteredImages])

  const stopRanking = useCallback(() => {
    setIsRanking(false)
  }, [])

  const recordComparison = useCallback((winnerId: string, loserId: string) => {
    setEloScores((prev) => eloUpdate(prev, winnerId, loserId, 1))
  }, [])

  const recordSkip = useCallback((aId: string, bId: string) => {
    setEloScores((prev) => eloUpdate(prev, aId, bId, 0.5))
  }, [])

  const applyEloSort = useCallback(() => {
    setSortField('elo')
    setSortDir('desc')
    setImages((prev) => applySort(prev, 'elo', 'desc', eloScores))
  }, [eloScores])

  // Keep/toss actions
  const startKeepToss = useCallback(() => {
    setIsKeepToss(true)
  }, [])

  const stopKeepToss = useCallback(() => {
    setIsKeepToss(false)
  }, [])

  const decideKeepToss = useCallback((id: string, decision: KeepTossDecision) => {
    setKeepTossDecisions((prev) => {
      const next = new Map(prev)
      next.set(id, decision)
      return next
    })
  }, [])

  const undoKeepToss = useCallback((id: string) => {
    setKeepTossDecisions((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const resetKeepToss = useCallback(() => {
    setKeepTossDecisions(new Map())
  }, [])

  const deleteTossed = useCallback(async () => {
    const tossedIds = [...keepTossDecisions.entries()].filter(([, d]) => d === 'toss').map(([id]) => id)
    if (tossedIds.length === 0) return
    setIsWorking(true)
    try {
      const result = await window.api.trashImages(tossedIds)
      const deleted = new Set(tossedIds.filter((p) => !result.errors.includes(p)))
      setImages((prev) => prev.filter((i) => !deleted.has(i.id)))
      setKeepTossDecisions((prev) => {
        const next = new Map(prev)
        deleted.forEach((p) => next.delete(p))
        return next
      })
      setSelectedIds((prev) => {
        const next = new Set(prev)
        deleted.forEach((p) => next.delete(p))
        return next
      })
      if (!result.ok) {
        setError(`Failed to delete ${result.errors.length} file(s). They remain marked.`)
      }
    } catch {
      setError('Failed to move files to recycle bin.')
    } finally {
      setIsWorking(false)
    }
  }, [keepTossDecisions])

  const moveKept = useCallback(
    async (destFolder: string) => {
      const keptIds = [...keepTossDecisions.entries()].filter(([, d]) => d === 'keep').map(([id]) => id)
      if (keptIds.length === 0 || !destFolder.trim()) return
      setIsWorking(true)
      try {
        const result = await window.api.moveImages(keptIds, destFolder.trim())
        const movedMap = new Map(result.moved.map((m) => [m.oldPath, m.newPath]))
        setImages((prev) =>
          prev.map((img) => {
            const newPath = movedMap.get(img.id)
            return newPath ? { ...img, id: newPath, path: newPath } : img
          })
        )
        setKeepTossDecisions((prev) => {
          const next = new Map(prev)
          movedMap.forEach((_newPath, oldPath) => next.delete(oldPath))
          return next
        })
        setSelectedIds((prev) => {
          const next = new Set<string>()
          prev.forEach((id) => next.add(movedMap.get(id) ?? id))
          return next
        })
        if (!result.ok) {
          setError(`Failed to move ${result.errors.length} file(s).`)
        }
      } catch {
        setError('Failed to move files.')
      } finally {
        setIsWorking(false)
      }
    },
    [keepTossDecisions]
  )

  // Tag actions
  const addTagToSelected = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().replace(/,/g, '')
      if (!trimmed) return
      setDraftTags((prev) => {
        const next = new Map(prev)
        for (const id of selectedIds) {
          const img = images.find((i) => i.id === id)
          if (!img) continue
          const current = next.get(id) ?? img.tags
          if (!current.includes(trimmed)) next.set(id, [...current, trimmed])
        }
        return next
      })
    },
    [selectedIds, images]
  )

  const removeTagFromSelected = useCallback(
    (tag: string) => {
      setDraftTags((prev) => {
        const next = new Map(prev)
        for (const id of selectedIds) {
          const img = images.find((i) => i.id === id)
          if (!img) continue
          const current = next.get(id) ?? img.tags
          next.set(id, current.filter((t) => t !== tag))
        }
        return next
      })
    },
    [selectedIds, images]
  )

  const saveTags = useCallback(async () => {
    if (draftTags.size === 0) return
    setIsWorking(true)
    try {
      const saves = [...draftTags.entries()].map(([imgId, tags]) => ({imagePath: imgId, tags}))
      const result = await window.api.saveTags(saves)
      setImages((prev) =>
        prev.map((img) => {
          const saved = draftTags.get(img.id)
          return saved !== undefined ? {...img, tags: saved} : img
        })
      )
      setDraftTags(new Map())
      if (!result.ok) {
        setError(`Failed to save tags for ${result.errors.length} file(s).`)
      }
    } catch {
      setError('Failed to save tags.')
    } finally {
      setIsWorking(false)
    }
  }, [draftTags])

  const cycleTagFilter = useCallback((tag: string) => {
    setTagFilters((prev) => {
      const next = new Map(prev)
      const current = next.get(tag)
      if (!current) next.set(tag, 'include')
      else if (current === 'include') next.set(tag, 'exclude')
      else next.delete(tag)
      return next
    })
  }, [])

  const clearTagFilters = useCallback(() => {
    setTagFilters(new Map())
  }, [])

  const renameAll = useCallback(
    async (baseName: string) => {
      if (filteredImages.length === 0 || !baseName.trim()) return
      setIsWorking(true)
      try {
        const count = filteredImages.length
        const digits = Math.max(3, String(count).length)
        const renames = filteredImages.map((img, idx) => {
          const dotIdx = img.name.lastIndexOf('.')
          const ext = dotIdx !== -1 ? img.name.slice(dotIdx) : ''
          const num = String(idx + 1).padStart(digits, '0')
          return {oldPath: img.path, newName: `${baseName.trim()}_${num}${ext}`}
        })
        const results = await window.api.renameImages(renames)

        const pathMap = new Map<string, {newPath: string; newName: string}>()
        for (const r of results) {
          if (r.ok) pathMap.set(r.oldPath, {newPath: r.newPath, newName: r.newName})
        }

        setImages((prev) =>
          prev.map((img) => {
            const mapped = pathMap.get(img.id)
            return mapped ? {...img, id: mapped.newPath, path: mapped.newPath, name: mapped.newName} : img
          })
        )
        setSelectedIds((prev) => {
          const next = new Set<string>()
          prev.forEach((id) => {
            const mapped = pathMap.get(id)
            next.add(mapped ? mapped.newPath : id)
          })
          return next
        })
        setCulledIds((prev) => {
          const next = new Set<string>()
          prev.forEach((id) => {
            const mapped = pathMap.get(id)
            next.add(mapped ? mapped.newPath : id)
          })
          return next
        })
        setEloScores((prev) => {
          const next = new Map<string, number>()
          prev.forEach((score, id) => {
            const mapped = pathMap.get(id)
            next.set(mapped ? mapped.newPath : id, score)
          })
          return next
        })
        setDraftTags((prev) => {
          const next = new Map<string, string[]>()
          prev.forEach((tags, id) => {
            const mapped = pathMap.get(id)
            next.set(mapped ? mapped.newPath : id, tags)
          })
          return next
        })
        setKeepTossDecisions((prev) => {
          const next = new Map<string, KeepTossDecision>()
          prev.forEach((decision, id) => {
            const mapped = pathMap.get(id)
            next.set(mapped ? mapped.newPath : id, decision)
          })
          return next
        })
        setModalImageId((prev) => {
          if (!prev) return prev
          const mapped = pathMap.get(prev)
          return mapped ? mapped.newPath : prev
        })

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
    startRanking,
    stopRanking,
    recordComparison,
    recordSkip,
    applyEloSort,
    isKeepToss,
    keepTossDecisions,
    startKeepToss,
    stopKeepToss,
    decideKeepToss,
    undoKeepToss,
    resetKeepToss,
    deleteTossed,
    moveKept,
    renameAll,
    draftTags,
    hasPendingTags: draftTags.size > 0,
    addTagToSelected,
    removeTagFromSelected,
    saveTags,
    filteredImages,
    tagFilters,
    cycleTagFilter,
    clearTagFilters
  }
}
