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
      if (entry.isFile()) {
        const fullPath = path.join(dirPath, entry.name)
        if (isImageFile(fullPath)) results.push(fullPath)
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
      const tagPath = path.join(path.dirname(p), path.basename(p, path.extname(p)) + '.txt')
      let tags: string[] = []
      try {
        if (fs.existsSync(tagPath)) {
          tags = fs.readFileSync(tagPath, 'utf-8').split(',').map(t => t.trim()).filter(Boolean)
        }
      } catch { /* ignore unreadable tag files */ }
      return {
        id: p,
        name: path.basename(p),
        path: p,
        mtime: stat.mtimeMs,
        birthtime: stat.birthtimeMs,
        tags
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

  ipcMain.handle('tags:save', async (_event, saves: Array<{imagePath: string, tags: string[]}>) => {
    const errors: string[] = []
    for (const {imagePath, tags} of saves) {
      const tagPath = path.join(path.dirname(imagePath), path.basename(imagePath, path.extname(imagePath)) + '.txt')
      try {
        if (tags.length === 0) {
          if (fs.existsSync(tagPath)) await fs.promises.unlink(tagPath)
        } else {
          await fs.promises.writeFile(tagPath, tags.join(', '), 'utf-8')
        }
      } catch (e) {
        errors.push(imagePath)
        console.error('Error saving tags:', tagPath, e)
      }
    }
    return { ok: errors.length === 0, errors }
  })

  ipcMain.handle('images:rename', async (_event, renames: Array<{oldPath: string, newName: string}>) => {
    const results: Array<{oldPath: string, newName: string, newPath: string, ok: boolean, error?: string}> = []
    for (const {oldPath, newName} of renames) {
      const newPath = path.join(path.dirname(oldPath), newName)
      try {
        await fs.promises.rename(oldPath, newPath)
        results.push({oldPath, newName, newPath, ok: true})
      } catch (e) {
        results.push({oldPath, newName, newPath, ok: false, error: String(e)})
        console.error('Error renaming:', oldPath, '->', newPath, e)
      }
    }
    return results
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
