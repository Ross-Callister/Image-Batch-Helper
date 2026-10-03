import { ipcMain, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import type { ImageItem, RenameRequest, RenameResult } from '../../shared/ipcTypes'
import { isMediaPath } from '../../shared/mediaTypes'

const TRASH_CONCURRENCY = 4
const PROGRESS_INTERVAL_MS = 50

function isImageFile(filePath: string): boolean {
  return isMediaPath(filePath)
}

// Each file call on a network or WSL path is a slow round trip, so run many at once.
const LOAD_CONCURRENCY = 32

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function tagPathFor(imagePath: string): string {
  return path.join(path.dirname(imagePath), path.basename(imagePath, path.extname(imagePath)) + '.txt')
}

interface ScanResult {
  mediaPaths: string[]
  // .txt files seen while scanning, so images without a tag file need no extra lookup.
  textPaths: Set<string>
}

// Recurses into subdirectories. Symlinked directories are not followed
// (Dirent reports them as symlinks), which avoids cycles.
async function scanDirectory(directoryPath: string, result: ScanResult): Promise<void> {
  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(directoryPath, { withFileTypes: true })
  } catch (error) {
    console.error('Error scanning directory:', directoryPath, error)
    return
  }
  const subdirectories: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      subdirectories.push(fullPath)
    } else if (entry.isFile()) {
      if (isImageFile(fullPath)) result.mediaPaths.push(fullPath)
      else if (path.extname(entry.name).toLowerCase() === '.txt') result.textPaths.add(fullPath)
    }
  }
  await Promise.all(subdirectories.map((subdirectory) => scanDirectory(subdirectory, result)))
}

async function readTags(tagPath: string): Promise<string[]> {
  try {
    const text = await fs.promises.readFile(tagPath, 'utf-8')
    return text.split(',').map((tag) => tag.trim()).filter(Boolean)
  } catch {
    // Missing or unreadable tag files mean no tags.
    return []
  }
}

export function registerImageHandlers(): void {
  ipcMain.handle('images:load', async (_event, paths: string[]) => {
    const scan: ScanResult = { mediaPaths: [], textPaths: new Set() }
    // Individually dropped files weren't scanned, so their tag files must be looked up directly.
    const unscannedPaths = new Set<string>()

    await Promise.all(
      paths.map(async (candidatePath) => {
        try {
          const stat = await fs.promises.stat(candidatePath)
          if (stat.isDirectory()) {
            await scanDirectory(candidatePath, scan)
          } else if (stat.isFile() && isImageFile(candidatePath)) {
            scan.mediaPaths.push(candidatePath)
            unscannedPaths.add(candidatePath)
          }
        } catch (error) {
          console.error('Error statting path:', candidatePath, error)
        }
      })
    )

    // Dropping a folder alongside one of its subfolders would otherwise yield duplicates.
    const imagePaths = [...new Set(scan.mediaPaths)]
    const items = await mapWithConcurrency(imagePaths, LOAD_CONCURRENCY, async (imagePath) => {
      try {
        const tagPath = tagPathFor(imagePath)
        const [stat, tags] = await Promise.all([
          fs.promises.stat(imagePath),
          scan.textPaths.has(tagPath) || unscannedPaths.has(imagePath)
            ? readTags(tagPath)
            : Promise.resolve([])
        ])
        const item: ImageItem = {
          id: imagePath,
          name: path.basename(imagePath),
          path: imagePath,
          mtime: stat.mtimeMs,
          birthtime: stat.birthtimeMs,
          tags
        }
        return item
      } catch (error) {
        console.error('Error reading image info:', imagePath, error)
        return null
      }
    })
    return items.filter((item): item is ImageItem => item !== null)
  })

  ipcMain.handle('images:trash', async (event, paths: string[], requestId?: number) => {
    const errors: string[] = []
    let next = 0
    let done = 0
    let lastSent = 0

    const reportProgress = (force = false) => {
      if (requestId === undefined || event.sender.isDestroyed()) return
      const now = Date.now()
      if (!force && now - lastSent < PROGRESS_INTERVAL_MS) return
      lastSent = now
      event.sender.send('images:trashProgress', requestId, { done, total: paths.length })
    }

    // trashItem handles one file per call and each call is slow, so run a few at once.
    const worker = async () => {
      while (next < paths.length) {
        const imagePath = paths[next++]
        try {
          await shell.trashItem(imagePath)
        } catch (error) {
          errors.push(imagePath)
          console.error('Error trashing:', imagePath, error)
        }
        done++
        reportProgress()
      }
    }

    await Promise.all(Array.from({ length: Math.min(TRASH_CONCURRENCY, paths.length) }, worker))
    reportProgress(true)
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
