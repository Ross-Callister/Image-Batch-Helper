import { describe, expect, it } from 'vitest'
import { isMediaPath, isVideoPath } from './mediaTypes'

describe('isVideoPath', () => {
  it('detects mp4 files regardless of case', () => {
    expect(isVideoPath('C:\\clips\\intro.mp4')).toBe(true)
    expect(isVideoPath('/home/me/INTRO.MP4')).toBe(true)
  })

  it('rejects images and extensionless paths', () => {
    expect(isVideoPath('photo.jpg')).toBe(false)
    expect(isVideoPath('/home/me/folder.mp4/file')).toBe(false)
  })
})

describe('isMediaPath', () => {
  it('accepts supported images and videos', () => {
    expect(isMediaPath('a.jpeg')).toBe(true)
    expect(isMediaPath('a.webp')).toBe(true)
    expect(isMediaPath('a.mp4')).toBe(true)
  })

  it('rejects unsupported files', () => {
    expect(isMediaPath('notes.txt')).toBe(false)
    expect(isMediaPath('movie.mov')).toBe(false)
  })
})
