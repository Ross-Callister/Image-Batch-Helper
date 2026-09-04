import { describe, expect, it } from 'vitest'
import { applyModifiedTime } from './imageMetadata'
import type { ImageItem } from './types'

describe('image metadata', () => {
  it('updates every attempted touch path, including paths reported as failed by IPC', () => {
    const images: ImageItem[] = [
      { id: 'a', path: 'a', name: 'a.jpg', mtime: 1, birthtime: 0, tags: [] },
      { id: 'b', path: 'b', name: 'b.jpg', mtime: 2, birthtime: 0, tags: [] },
      { id: 'c', path: 'c', name: 'c.jpg', mtime: 3, birthtime: 0, tags: [] }
    ]

    expect(applyModifiedTime(images, ['a', 'b'], 100).map((image) => image.mtime)).toEqual([100, 100, 3])
    expect(images.map((image) => image.mtime)).toEqual([1, 2, 3])
  })
})
