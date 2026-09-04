import { describe, expect, it } from 'vitest'
import { sortImages } from './imageSorting'
import type { ImageItem } from './types'

const images: ImageItem[] = [
  { id: '10', path: '10', name: 'image10.jpg', mtime: 30, birthtime: 10, tags: [] },
  { id: '2', path: '2', name: 'image2.png', mtime: 10, birthtime: 30, tags: [] },
  { id: '1', path: '1', name: 'image1', mtime: 20, birthtime: 20, tags: [] }
]

describe('image sorting', () => {
  it('sorts names numerically without mutating the source', () => {
    expect(sortImages(images, 'name', 'asc').map((image) => image.id)).toEqual(['1', '2', '10'])
    expect(images.map((image) => image.id)).toEqual(['10', '2', '1'])
  })

  it('sorts dates and Elo scores in either direction', () => {
    expect(sortImages(images, 'mtime', 'desc').map((image) => image.id)).toEqual(['10', '1', '2'])
    expect(sortImages(images, 'birthtime', 'asc').map((image) => image.id)).toEqual(['10', '1', '2'])
    expect(sortImages(images, 'elo', 'desc', new Map([['2', 1200]])).map((image) => image.id)[0]).toBe('2')
  })

  it('returns the original array for custom order', () => {
    expect(sortImages(images, 'custom', 'asc')).toBe(images)
  })
})
