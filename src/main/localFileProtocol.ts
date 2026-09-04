import { protocol } from 'electron'
import { readFile } from 'fs/promises'
import { extname } from 'path'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}

export function registerLocalFileScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'localfile',
      privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
    }
  ])
}

export function handleLocalFiles(): void {
  protocol.handle('localfile', async (request) => {
    try {
      const parsed = new URL(request.url)
      const filePath = decodeURIComponent(
        parsed.hostname
          ? parsed.hostname.toUpperCase() + ':' + parsed.pathname
          : parsed.pathname
      )
      const data = await readFile(filePath)
      const mime = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      return new Response(data, { headers: { 'Content-Type': mime } })
    } catch (error) {
      console.error('[localfile] error:', error)
      return new Response('Not found', { status: 404 })
    }
  })
}
