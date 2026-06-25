import { ipcMain, shell, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

function scanDirectory(dirPath: string): string[] {
  const results: string[] = []
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        results.push(...scanDirectory(fullPath))
      } else if (entry.isFile() && isImageFile(fullPath)) {
        results.push(fullPath)
      }
    }
  } catch (e) {
    console.error('Error scanning directory:', dirPath, e)
  }
  return results
}

export function registerIpcHandlers(): void {
  ipcMain.handle('images:load', async (_event, paths: string[]) => {
    const imagePaths: string[] = []

    for (const p of paths) {
      try {
        const stat = fs.statSync(p)
        if (stat.isDirectory()) {
          imagePaths.push(...scanDirectory(p))
        } else if (stat.isFile() && isImageFile(p)) {
          imagePaths.push(p)
        }
      } catch (e) {
        console.error('Error statting path:', p, e)
      }
    }

    return imagePaths.map((p) => {
      const stat = fs.statSync(p)
      return {
        id: p,
        name: path.basename(p),
        path: p,
        mtime: stat.mtimeMs,
        birthtime: stat.birthtimeMs
      }
    })
  })

  ipcMain.handle('images:trash', async (_event, paths: string[]) => {
    const errors: string[] = []
    for (const p of paths) {
      try {
        await shell.trashItem(p)
      } catch (e) {
        errors.push(p)
        console.error('Error trashing:', p, e)
      }
    }
    return { ok: errors.length === 0, errors }
  })

  ipcMain.handle('images:touch', async (_event, paths: string[]) => {
    const now = new Date()
    const errors: string[] = []
    for (const p of paths) {
      try {
        fs.utimesSync(p, now, now)
      } catch (e) {
        errors.push(p)
        console.error('Error touching:', p, e)
      }
    }
    return { ok: errors.length === 0, errors }
  })

  ipcMain.handle('dialog:confirm', async (_event, message: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showMessageBox(win!, {
      type: 'warning',
      buttons: ['Replace', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      message: 'Replace images?',
      detail: message
    })
    return result.response === 0
  })
}
