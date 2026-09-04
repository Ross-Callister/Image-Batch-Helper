import type { ImageItem } from './types'

export function applyModifiedTime(
  images: ImageItem[],
  touchedPaths: string[],
  modifiedTime: number
): ImageItem[] {
  const touched = new Set(touchedPaths)
  return images.map((image) =>
    touched.has(image.path) ? { ...image, mtime: modifiedTime } : image
  )
}
