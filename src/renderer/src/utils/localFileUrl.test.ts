import { describe, expect, it } from 'vitest'
import { toLocalFileUrl } from './localFileUrl'

describe('toLocalFileUrl', () => {
  it('keeps Windows drive paths in the URL path', () => {
    expect(toLocalFileUrl('C:\\Photos\\My Trip\\a.jpg')).toBe('localfile://file/C%3A/Photos/My%20Trip/a.jpg')
  })

  it('keeps POSIX paths in the URL path', () => {
    expect(toLocalFileUrl('/Home/me/a.mp4')).toBe('localfile://file/Home/me/a.mp4')
  })

  it('marks UNC paths so the server prefix survives', () => {
    expect(toLocalFileUrl('\\\\wsl.localhost\\Ubuntu\\home\\a b.png')).toBe(
      'localfile://unc/wsl.localhost/Ubuntu/home/a%20b.png'
    )
  })

  it('encodes characters that would otherwise end the path', () => {
    expect(toLocalFileUrl('/clips/take #2?.mp4')).toBe('localfile://file/clips/take%20%232%3F.mp4')
  })
})
