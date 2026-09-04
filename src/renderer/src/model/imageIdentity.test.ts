import { describe, expect, it } from 'vitest'
import {
  remapImages,
  remapMap,
  remapOptionalId,
  remapSet,
  removeFromMap,
  removeFromSet,
  removeImages,
  successfulRenameMap
} from './imageIdentity'
import { createRenameRequests } from './renamePlan'
import type { ImageItem, RenameResult } from './types'

const images: ImageItem[] = [
  { id: '10', path: '10', name: 'image10.jpg', mtime: 30, birthtime: 10, tags: [] },
  { id: '2', path: '2', name: 'image2.png', mtime: 10, birthtime: 30, tags: [] },
  { id: '1', path: '1', name: 'image1', mtime: 20, birthtime: 20, tags: [] }
]

const results: RenameResult[] = [
  { oldPath: '10', newPath: 'new-10', newName: 'batch_001.jpg', ok: true },
  { oldPath: '2', newPath: 'new-2', newName: 'batch_002.png', ok: false }
]

describe('rename planning', () => {
  it('uses display order, preserves extensions, and pads sequence numbers', () => {
    expect(createRenameRequests(images, ' batch ')).toEqual([
      { oldPath: '10', newName: 'batch_001.jpg' },
      { oldPath: '2', newName: 'batch_002.png' },
      { oldPath: '1', newName: 'batch_003' }
    ])
  })
})

describe('image identity transformations', () => {
  const changes = successfulRenameMap(results)

  it('remaps only successful results across identity-keyed collections', () => {
    expect(remapImages(images, changes).map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'new-10', name: 'batch_001.jpg' },
      { id: '2', name: 'image2.png' },
      { id: '1', name: 'image1' }
    ])
    expect(remapSet(new Set(['10', '2']), changes)).toEqual(new Set(['new-10', '2']))
    expect(remapMap(new Map([['10', 42], ['2', 7]]), changes)).toEqual(new Map([['new-10', 42], ['2', 7]]))
    expect(remapOptionalId('10', changes)).toBe('new-10')
    expect(remapOptionalId(null, changes)).toBeNull()
  })

  it('removes completed IDs from state without mutating inputs', () => {
    const removed = new Set(['2'])
    const selected = new Set(['10', '2'])
    const decisions = new Map([['10', 'keep'], ['2', 'toss']])
    expect(removeImages(images, removed).map((image) => image.id)).toEqual(['10', '1'])
    expect(removeFromSet(selected, removed)).toEqual(new Set(['10']))
    expect(removeFromMap(decisions, removed)).toEqual(new Map([['10', 'keep']]))
    expect(selected).toEqual(new Set(['10', '2']))
  })
})
