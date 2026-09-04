import { useCallback, type Dispatch, type SetStateAction } from 'react'
import type { ImageItem } from '../../model/types'
import type { TagFilterMode } from './tagSelectors'

interface TagActionDependencies {
  images: ImageItem[]
  selectedIds: Set<string>
  draftTags: Map<string, string[]>
  setImages: Dispatch<SetStateAction<ImageItem[]>>
  setDraftTags: Dispatch<SetStateAction<Map<string, string[]>>>
  setTagFilters: Dispatch<SetStateAction<Map<string, TagFilterMode>>>
  setIsWorking: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
}

export function useTagActions({
  images,
  selectedIds,
  draftTags,
  setImages,
  setDraftTags,
  setTagFilters,
  setIsWorking,
  setError
}: TagActionDependencies) {
  const addTagToSelected = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().replace(/,/g, '')
      if (!trimmed) return
      setDraftTags((previous) => {
        const next = new Map(previous)
        for (const id of selectedIds) {
          const image = images.find((candidate) => candidate.id === id)
          if (!image) continue
          const current = next.get(id) ?? image.tags
          if (!current.includes(trimmed)) next.set(id, [...current, trimmed])
        }
        return next
      })
    },
    [images, selectedIds, setDraftTags]
  )

  const removeTagFromSelected = useCallback(
    (tag: string) => {
      setDraftTags((previous) => {
        const next = new Map(previous)
        for (const id of selectedIds) {
          const image = images.find((candidate) => candidate.id === id)
          if (!image) continue
          const current = next.get(id) ?? image.tags
          next.set(id, current.filter((candidate) => candidate !== tag))
        }
        return next
      })
    },
    [images, selectedIds, setDraftTags]
  )

  const saveTags = useCallback(async () => {
    if (draftTags.size === 0) return
    setIsWorking(true)
    try {
      const saves = [...draftTags].map(([imagePath, tags]) => ({ imagePath, tags }))
      const result = await window.api.saveTags(saves)
      setImages((previous) =>
        previous.map((image) => {
          const saved = draftTags.get(image.id)
          return saved !== undefined ? { ...image, tags: saved } : image
        })
      )
      setDraftTags(new Map())
      if (!result.ok) setError(`Failed to save tags for ${result.errors.length} file(s).`)
    } catch {
      setError('Failed to save tags.')
    } finally {
      setIsWorking(false)
    }
  }, [draftTags, setDraftTags, setError, setImages, setIsWorking])

  const cycleTagFilter = useCallback(
    (tag: string) => {
      setTagFilters((previous) => {
        const next = new Map(previous)
        const current = next.get(tag)
        if (!current) next.set(tag, 'include')
        else if (current === 'include') next.set(tag, 'exclude')
        else next.delete(tag)
        return next
      })
    },
    [setTagFilters]
  )

  const clearTagFilters = useCallback(() => setTagFilters(new Map()), [setTagFilters])

  return { addTagToSelected, removeTagFromSelected, saveTags, cycleTagFilter, clearTagFilters }
}
