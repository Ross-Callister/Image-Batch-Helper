import type { ImageItem, RenameResult } from './types'

export type PathChange = { newPath: string; newName?: string }

export function successfulRenameMap(results: RenameResult[]): Map<string, PathChange> {
  const pathChanges = new Map<string, PathChange>()
  for (const result of results) {
    if (result.ok) {
      pathChanges.set(result.oldPath, { newPath: result.newPath, newName: result.newName })
    }
  }
  return pathChanges
}

export function remapImages(images: ImageItem[], pathChanges: Map<string, PathChange>): ImageItem[] {
  return images.map((image) => {
    const change = pathChanges.get(image.id)
    if (!change) return image
    return {
      ...image,
      id: change.newPath,
      path: change.newPath,
      name: change.newName ?? image.name
    }
  })
}

export function remapSet(values: Set<string>, pathChanges: Map<string, PathChange>): Set<string> {
  return new Set([...values].map((value) => pathChanges.get(value)?.newPath ?? value))
}

export function remapMap<T>(values: Map<string, T>, pathChanges: Map<string, PathChange>): Map<string, T> {
  return new Map([...values].map(([key, value]) => [pathChanges.get(key)?.newPath ?? key, value]))
}

export function remapOptionalId(value: string | null, pathChanges: Map<string, PathChange>): string | null {
  return value ? pathChanges.get(value)?.newPath ?? value : value
}

export function removeImages(images: ImageItem[], removedIds: Set<string>): ImageItem[] {
  return images.filter((image) => !removedIds.has(image.id))
}

export function removeFromSet(values: Set<string>, removedIds: Set<string>): Set<string> {
  const next = new Set(values)
  removedIds.forEach((id) => next.delete(id))
  return next
}

export function removeFromMap<T>(values: Map<string, T>, removedIds: Set<string>): Map<string, T> {
  const next = new Map(values)
  removedIds.forEach((id) => next.delete(id))
  return next
}
