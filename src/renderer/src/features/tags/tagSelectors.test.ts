import { describe, expect, it } from 'vitest'
import type { ImageItem } from '../../model/types'
import { commonTags, countTags, filterImagesByTags, selectionTags } from './tagSelectors'

const images: ImageItem[] = [
  { id: '10', path: '10', name: '10.jpg', mtime: 0, birthtime: 0, tags: ['warm'] },
  { id: '2', path: '2', name: '2.jpg', mtime: 0, birthtime: 0, tags: ['warm', 'best'] },
  { id: '1', path: '1', name: '1.jpg', mtime: 0, birthtime: 0, tags: ['cool'] }
]

const drafts = new Map([['1', ['warm', 'draft']]])

describe('tag selectors', () => {
  it('filters with draft-aware include and exclude rules', () => {
    const filters = new Map<string, 'include' | 'exclude'>([
      ['warm', 'include'],
      ['best', 'exclude']
    ])
    expect(filterImagesByTags(images, drafts, filters).map((image) => image.id)).toEqual(['10', '1'])
  })

  it('counts and intersects effective tags', () => {
    expect(countTags(images, drafts)).toEqual([['warm', 3], ['best', 1], ['draft', 1]])
    expect(commonTags([images[0], images[2]], drafts)).toEqual(['warm'])
  })

  it('keeps an active filter visible after that tag is removed from the selection', () => {
    const selected = images.slice(0, 2)
    const draftsWithoutWarm = new Map(selected.map((image) => [image.id, image.tags.filter((tag) => tag !== 'warm')]))
    const filters = new Map<string, 'include' | 'exclude'>([['warm', 'include']])

    expect(selectionTags(selected, draftsWithoutWarm, filters)).toEqual([
      { name: 'warm', isCommon: false, filterMode: 'include' }
    ])
  })
})
