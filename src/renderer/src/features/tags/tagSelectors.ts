import type { ImageItem } from '../../model/types'

export type TagFilterMode = 'include' | 'exclude'

export interface SelectionTag {
  name: string
  isCommon: boolean
  filterMode?: TagFilterMode
}

export function effectiveTags(image: ImageItem, drafts: Map<string, string[]>): string[] {
  return drafts.get(image.id) ?? image.tags
}

export function filterImagesByTags(
  images: ImageItem[],
  drafts: Map<string, string[]>,
  filters: Map<string, TagFilterMode>
): ImageItem[] {
  if (filters.size === 0) return images

  return images.filter((image) => {
    const tags = effectiveTags(image, drafts)
    for (const [tag, mode] of filters) {
      if (mode === 'include' && !tags.includes(tag)) return false
      if (mode === 'exclude' && tags.includes(tag)) return false
    }
    return true
  })
}

export function countTags(images: ImageItem[], drafts: Map<string, string[]>): Array<[string, number]> {
  const counts = new Map<string, number>()
  for (const image of images) {
    for (const tag of effectiveTags(image, drafts)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1])
}

export function commonTags(images: ImageItem[], drafts: Map<string, string[]>): string[] {
  if (images.length === 0) return []
  return effectiveTags(images[0], drafts).filter((tag) =>
    images.every((image) => effectiveTags(image, drafts).includes(tag))
  )
}

export function selectionTags(
  images: ImageItem[],
  drafts: Map<string, string[]>,
  filters: Map<string, TagFilterMode>
): SelectionTag[] {
  const common = commonTags(images, drafts)
  const commonNames = new Set(common)
  const tags = common.map((name) => ({
    name,
    isCommon: true,
    filterMode: filters.get(name)
  }))

  for (const [name, filterMode] of filters) {
    if (!commonNames.has(name)) tags.push({ name, isCommon: false, filterMode })
  }

  return tags
}
