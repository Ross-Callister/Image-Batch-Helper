import { protocol } from 'electron'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { extname } from 'path'
import { Readable } from 'stream'
import { parseByteRange } from './byteRange'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
}

export function registerLocalFileScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'localfile',
      privileges: {
        secure: true,
        standard: true,
        supportFetchAPI: true,
        corsEnabled: true,
        // Required for <video> to stream and seek.
        stream: true
      }
    }
  ])
}

function fileBody(filePath: string, start: number, end: number): ReadableStream {
  return Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream
}

export function handleLocalFiles(): void {
  protocol.handle('localfile', async (request) => {
    try {
      // localfile://file/C%3A/dir/a.jpg on Windows, localfile://file/home/dir/a.jpg elsewhere,
      // localfile://unc/server/share/a.jpg for \\server\share\a.jpg.
      const url = new URL(request.url)
      const pathname = decodeURIComponent(url.pathname)
      const filePath =
        url.hostname === 'unc'
          ? '\\\\' + pathname.slice(1).replace(/\//g, '\\')
          : /^\/[A-Za-z]:\//.test(pathname)
            ? pathname.slice(1)
            : pathname
      const { size } = await stat(filePath)
      const mime = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      const headers = { 'Content-Type': mime, 'Accept-Ranges': 'bytes' }

      // Video elements request byte ranges; without 206 responses they can't seek or loop.
      const range = parseByteRange(request.headers.get('Range'), size)
      if (range === 'unsatisfiable') {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
      }
      if (range) {
        return new Response(fileBody(filePath, range.start, range.end), {
          status: 206,
          headers: {
            ...headers,
            'Content-Length': String(range.end - range.start + 1),
            'Content-Range': `bytes ${range.start}-${range.end}/${size}`
          }
        })
      }
      if (size === 0) return new Response(null, { headers: { ...headers, 'Content-Length': '0' } })
      return new Response(fileBody(filePath, 0, size - 1), {
        headers: { ...headers, 'Content-Length': String(size) }
      })
    } catch (error) {
      console.error('[localfile] error:', error)
      return new Response('Not found', { status: 404 })
    }
  })
}
