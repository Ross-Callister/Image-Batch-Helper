import { app, BrowserWindow, shell, protocol } from 'electron'
import { join, extname } from 'path'
import { readFile } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './fileOps'

// Must be called before app.ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'localfile',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
  }
])

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Image Batch Helper',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.imagebatchhelper')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const MIME: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  }

  // Serve local image files through a custom protocol.
  // Chromium (standard: true) normalises localfile:///D:/foo to localfile://d/foo,
  // treating the Windows drive letter as the URL hostname. Reconstruct accordingly.
  protocol.handle('localfile', async (request) => {
    try {
      const parsed = new URL(request.url)
      const filePath = decodeURIComponent(
        parsed.hostname
          ? parsed.hostname.toUpperCase() + ':' + parsed.pathname
          : parsed.pathname
      )
      const data = await readFile(filePath)
      const mime = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      return new Response(data, { headers: { 'Content-Type': mime } })
    } catch (e) {
      console.error('[localfile] error:', e)
      return new Response('Not found', { status: 404 })
    }
  })

  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
