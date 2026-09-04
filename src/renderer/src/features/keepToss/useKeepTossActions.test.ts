import { describe, expect, it, vi } from 'vitest'
import type { ImageItem, KeepTossDecision } from '../../model/types'

vi.mock('react', () => ({ useCallback: <T>(callback: T) => callback }))

import { useKeepTossActions } from './useKeepTossActions'

function applyUpdate<T>(current: T, update: T | ((value: T) => T)): T {
  return typeof update === 'function' ? (update as (value: T) => T)(current) : update
}

describe('keep/toss actions', () => {
  it('remaps only moved images and keeps failed decisions after a partial move', async () => {
    let images: ImageItem[] = [
      { id: 'a', path: 'a', name: 'a.jpg', mtime: 0, birthtime: 0, tags: [] },
      { id: 'b', path: 'b', name: 'b.jpg', mtime: 0, birthtime: 0, tags: [] }
    ]
    let selectedIds = new Set(['a', 'b'])
    let decisions = new Map<string, KeepTossDecision>([['a', 'keep'], ['b', 'keep']])
    let error: string | null = null
    let isWorking = false

    Object.assign(globalThis, { window: { api: {
      moveImages: vi.fn().mockResolvedValue({
        ok: false,
        errors: ['b'],
        moved: [{ oldPath: 'a', newPath: 'destination/a.jpg' }]
      })
    } as unknown as Window['api'] } })

    const actions = useKeepTossActions({
      decisions,
      setImages: (update) => { images = applyUpdate(images, update) },
      setSelectedIds: (update) => { selectedIds = applyUpdate(selectedIds, update) },
      setDecisions: (update) => { decisions = applyUpdate(decisions, update) },
      setIsKeepToss: () => undefined,
      setIsWorking: (update) => { isWorking = applyUpdate(isWorking, update) },
      setError: (update) => { error = applyUpdate(error, update) }
    })

    await actions.moveKept(' destination ')

    expect(window.api.moveImages).toHaveBeenCalledWith(['a', 'b'], 'destination')
    expect(images.map((image) => image.id)).toEqual(['destination/a.jpg', 'b'])
    expect(selectedIds).toEqual(new Set(['destination/a.jpg', 'b']))
    expect(decisions).toEqual(new Map([['b', 'keep']]))
    expect(error).toBe('Failed to move 1 file(s).')
    expect(isWorking).toBe(false)
  })

  it('removes only successfully deleted tossed images', async () => {
    let images: ImageItem[] = [
      { id: 'a', path: 'a', name: 'a.jpg', mtime: 0, birthtime: 0, tags: [] },
      { id: 'b', path: 'b', name: 'b.jpg', mtime: 0, birthtime: 0, tags: [] }
    ]
    let selectedIds = new Set(['a', 'b'])
    let decisions = new Map<string, KeepTossDecision>([['a', 'toss'], ['b', 'toss']])
    let error: string | null = null

    Object.assign(globalThis, { window: { api: {
      trashImages: vi.fn().mockResolvedValue({ ok: false, errors: ['b'] })
    } as unknown as Window['api'] } })

    const actions = useKeepTossActions({
      decisions,
      setImages: (update) => { images = applyUpdate(images, update) },
      setSelectedIds: (update) => { selectedIds = applyUpdate(selectedIds, update) },
      setDecisions: (update) => { decisions = applyUpdate(decisions, update) },
      setIsKeepToss: () => undefined,
      setIsWorking: () => undefined,
      setError: (update) => { error = applyUpdate(error, update) }
    })

    await actions.deleteTossed()

    expect(images.map((image) => image.id)).toEqual(['b'])
    expect(selectedIds).toEqual(new Set(['b']))
    expect(decisions).toEqual(new Map([['b', 'toss']]))
    expect(error).toBe('Failed to delete 1 file(s). They remain marked.')
  })
})
