import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import type { TagSaveRequest } from '../../shared/ipcTypes'

export function registerTagHandlers(): void {
  ipcMain.handle('tags:save', async (_event, saves: TagSaveRequest[]) => {
    const errors: string[] = []
    for (const { imagePath, tags } of saves) {
      const tagPath = path.join(
        path.dirname(imagePath),
        path.basename(imagePath, path.extname(imagePath)) + '.txt'
      )
      try {
        if (tags.length === 0) {
          if (fs.existsSync(tagPath)) await fs.promises.unlink(tagPath)
        } else {
          await fs.promises.writeFile(tagPath, tags.join(', '), 'utf-8')
        }
      } catch (error) {
        errors.push(imagePath)
        console.error('Error saving tags:', tagPath, error)
      }
    }
    return { ok: errors.length === 0, errors }
  })
}
