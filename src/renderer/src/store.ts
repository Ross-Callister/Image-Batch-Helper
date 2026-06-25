import { useState, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { ImageItem, SortField, SortDir } from './types'

function applySort(images: ImageItem[], field: SortField, dir: SortDir): ImageItem[] {
  if (field === 'custom') return images
  return [...images].sort((a, b) => {
    let cmp = 0
    if (field === 'name') cmp = a.name.localeCompare(b.name, undefined, { numeric: true })
    else if (field === 'mtime') cmp = a.mtime - b.mtime
    else if (field === 'birthtime') cmp = a.birthtime - b.birthtime
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
        const sorted = applySort(items, sortField, sortDir)
        setImages(sorted)
        setSelectedIds(new Set())
        setCulledIds(new Set())
        setLastClickedId(null)
        setModalImageId(null)
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
        setImages((prev) => applySort(prev, field, newDir))
      } else {
        setSortField(field)
        setSortDir('asc')
        setImages((prev) => applySort(prev, field, 'asc'))
      }
    },
    [sortField, sortDir]
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
    setError(null)
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(images.map((i) => i.id)))
  }, [images])

  const selectNone = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  return {
    images,
    selectedIds,
    culledIds,
    sortField,
    sortDir,
    modalImageId,
    error,
    isWorking,
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
    selectNone
  }
}
