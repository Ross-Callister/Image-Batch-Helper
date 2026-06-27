import { useState, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { ImageItem, SortField, SortDir } from './types'

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
          const ids = images.map((i) => i.id)
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
    [images, lastClickedId]
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
      const idx = images.findIndex((i) => i.id === modalImageId)
      if (idx === -1) return
      const next = dir === 'prev' ? idx - 1 : idx + 1
      if (next >= 0 && next < images.length) {
        setModalImageId(images[next].id)
      }
    },
    [images, modalImageId]
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
    if (images.length === 0) return
    setIsWorking(true)
    try {
      const paths = images.map((i) => i.path)
      const result = await window.api.touchImages(paths)
      const now = Date.now()
      setImages((prev) => prev.map((i) => ({ ...i, mtime: now })))
      if (!result.ok) {
        setError(`Failed to touch ${result.errors.length} file(s).`)
      }
    } catch {
      setError('Failed to touch files.')
    } finally {
      setIsWorking(false)
    }
  }, [images])

  const clearView = useCallback(() => {
    setImages([])
    setSelectedIds(new Set())
    setCulledIds(new Set())
    setLastClickedId(null)
    setModalImageId(null)
    setEloScores(new Map())
    setSortField('name')
    setSortDir('asc')
    setError(null)
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(images.map((i) => i.id)))
  }, [images])

  const selectNone = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // ELO ranking actions
  const startRanking = useCallback(() => {
    setEloScores((prev) => {
      const next = new Map(prev)
      images.forEach((img) => {
        if (!next.has(img.id)) next.set(img.id, ELO_DEFAULT)
      })
      return next
    })
    setIsRanking(true)
  }, [images])

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

  const renameAll = useCallback(
    async (baseName: string) => {
      if (images.length === 0 || !baseName.trim()) return
      setIsWorking(true)
      try {
        const count = images.length
        const digits = Math.max(3, String(count).length)
        const renames = images.map((img, idx) => {
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
    [images]
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
    renameAll
  }
}
