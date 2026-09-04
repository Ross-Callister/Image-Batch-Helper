import { describe, expect, it, vi } from 'vitest'
import type { ImageItem } from '../../model/types'

vi.mock('react', () => ({ useCallback: <T>(callback: T) => callback }))

import { useTagActions } from './useTagActions'

function applyUpdate<T>(current: T, update: T | ((value: T) => T)): T {
  return typeof update === 'function' ? (update as (value: T) => T)(current) : update
}

describe('tag actions', () => {
  it('commits and clears every draft after a partial filesystem failure', async () => {
    let images: ImageItem[] = [
      { id: 'a', path: 'a', name: 'a.jpg', mtime: 0, birthtime: 0, tags: [] },
      { id: 'b', path: 'b', name: 'b.jpg', mtime: 0, birthtime: 0, tags: [] }
    ]
    let drafts = new Map([['a', ['one']], ['b', ['two']]])
    let error: string | null = null
    let isWorking = false

    Object.assign(globalThis, { window: { api: {
      saveTags: vi.fn().mockResolvedValue({ ok: false, errors: ['b'] })
    } as unknown as Window['api'] } })

    const actions = useTagActions({
      images,
      selectedIds: new Set(),
      draftTags: drafts,
      setImages: (update) => { images = applyUpdate(images, update) },
      setDraftTags: (update) => { drafts = applyUpdate(drafts, update) },
      setTagFilters: () => undefined,
      setIsWorking: (update) => { isWorking = applyUpdate(isWorking, update) },
      setError: (update) => { error = applyUpdate(error, update) }
    })

    await actions.saveTags()

    expect(images.map((image) => image.tags)).toEqual([['one'], ['two']])
    expect(drafts).toEqual(new Map())
    expect(error).toBe('Failed to save tags for 1 file(s).')
    expect(isWorking).toBe(false)
  })
})
