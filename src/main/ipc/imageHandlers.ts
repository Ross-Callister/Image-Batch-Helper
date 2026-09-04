import { ipcMain, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import type { ImageItem, RenameRequest, RenameResult } from '../../shared/ipcTypes'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

function scanDirectory(directoryPath: string): string[] {
  const results: string[] = []
  try {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(directoryPath, entry.name)
        if (isImageFile(fullPath)) results.push(fullPath)
      }
    }
  } catch (error) {
    console.error('Error scanning directory:', directoryPath, error)
  }
  return results
}

export function registerImageHandlers(): void {
  ipcMain.handle('images:load', async (_event, paths: string[]) => {
    const imagePaths: string[] = []

    for (const candidatePath of paths) {
      try {
        const stat = fs.statSync(candidatePath)
        if (stat.isDirectory()) {
          imagePaths.push(...scanDirectory(candidatePath))
        } else if (stat.isFile() && isImageFile(candidatePath)) {
          imagePaths.push(candidatePath)
        }
      } catch (error) {
        console.error('Error statting path:', candidatePath, error)
      }
    }

    return imagePaths.map((imagePath): ImageItem => {
      const stat = fs.statSync(imagePath)
      const tagPath = path.join(
        path.dirname(imagePath),
        path.basename(imagePath, path.extname(imagePath)) + '.txt'
      )
      let tags: string[] = []
      try {
        if (fs.existsSync(tagPath)) {
          tags = fs.readFileSync(tagPath, 'utf-8').split(',').map((tag) => tag.trim()).filter(Boolean)
        }
      } catch {
        // Ignore unreadable tag files.
      }
      return {
        id: imagePath,
        name: path.basename(imagePath),
        path: imagePath,
        mtime: stat.mtimeMs,
        birthtime: stat.birthtimeMs,
        tags
      }
    })
  })

  ipcMain.handle('images:trash', async (_event, paths: string[]) => {
    const errors: string[] = []
    for (const imagePath of paths) {
      try {
        await shell.trashItem(imagePath)
      } catch (error) {
        errors.push(imagePath)
        console.error('Error trashing:', imagePath, error)
      }
    }
    return { ok: errors.length === 0, errors }
  })

  ipcMain.handle('images:touch', async (_event, paths: string[]) => {
    const now = new Date()
    const errors: string[] = []
    for (const imagePath of paths) {
      try {
        fs.utimesSync(imagePath, now, now)
      } catch (error) {
        errors.push(imagePath)
        console.error('Error touching:', imagePath, error)
      }
    }
    return { ok: errors.length === 0, errors }
  })

  ipcMain.handle('images:rename', async (_event, renames: RenameRequest[]) => {
    const results: RenameResult[] = []

    for (const { oldPath, newName } of renames) {
      const newPath = path.join(path.dirname(oldPath), newName)
      try {
        await fs.promises.rename(oldPath, newPath)
        results.push({ oldPath, newName, newPath, ok: true })
      } catch (error) {
        results.push({ oldPath, newName, newPath, ok: false, error: String(error) })
        console.error('Error renaming:', oldPath, '->', newPath, error)
      }
    }
    return results
  })

  ipcMain.handle('images:move', async (_event, paths: string[], destinationFolder: string) => {
    const errors: string[] = []
    const moved: Array<{ oldPath: string; newPath: string }> = []

    for (const imagePath of paths) {
      const destination = path.isAbsolute(destinationFolder)
        ? destinationFolder
        : path.resolve(path.dirname(imagePath), destinationFolder)
      const newPath = path.join(destination, path.basename(imagePath))

      try {
        await fs.promises.mkdir(destination, { recursive: true })
        try {
          await fs.promises.rename(imagePath, newPath)
        } catch (error: any) {
          if (error.code === 'EXDEV') {
            await fs.promises.copyFile(imagePath, newPath)
            await fs.promises.unlink(imagePath)
          } else {
            throw error
          }
        }

        const tagPath = path.join(
          path.dirname(imagePath),
          path.basename(imagePath, path.extname(imagePath)) + '.txt'
        )
        if (fs.existsSync(tagPath)) {
          const newTagPath = path.join(
            destination,
            path.basename(imagePath, path.extname(imagePath)) + '.txt'
          )
          try {
            await fs.promises.rename(tagPath, newTagPath)
          } catch {
            // Preserve the existing best-effort sidecar move behavior.
          }
        }
        moved.push({ oldPath: imagePath, newPath })
      } catch (error) {
        errors.push(imagePath)
        console.error('Error moving:', imagePath, '->', newPath, error)
      }
    }
    return { ok: errors.length === 0, errors, moved }
  })
}
