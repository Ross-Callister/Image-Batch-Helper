import { app } from 'electron'
import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

// Longest edge in pixels: grid cards are ~150-200px wide, doubled for high-DPI screens.
const THUMBNAIL_SIZE = 400
// Bump when THUMBNAIL_SIZE or the encoding changes so old thumbnails stop matching and age out.
const THUMBNAIL_VERSION = 1
const MAX_CACHE_BYTES = 500 * 1024 * 1024
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
// Re-touch a cache file's mtime at most this often; mtime records when it was last used.
const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000
const PRUNE_EVERY_N_WRITES = 500
// libvips already uses several threads per image, so a few at once saturates the CPU.
const MAX_CONCURRENT_GENERATIONS = 4

let cacheDirectory: string | null = null
let writesSincePrune = 0
let isPruning = false
const inFlight = new Map<string, Promise<Buffer>>()

function getCacheDirectory(): string {
  if (!cacheDirectory) {
    cacheDirectory = path.join(app.getPath('userData'), 'thumbnail-cache')
    fs.mkdirSync(cacheDirectory, { recursive: true })
  }
  return cacheDirectory
}

// Size and mtime are part of the key, so an edited source gets a new thumbnail and the
// stale one is left to age out.
function cacheKey(sourcePath: string, size: number, mtimeMs: number): string {
  return createHash('sha1')
    .update(`${THUMBNAIL_VERSION}\0${sourcePath}\0${size}\0${mtimeMs}`)
    .digest('hex')
}

let activeGenerations = 0
const generationQueue: Array<() => void> = []

async function withGenerationSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (activeGenerations >= MAX_CONCURRENT_GENERATIONS) {
    await new Promise<void>((resolve) => generationQueue.push(resolve))
  }
  activeGenerations++
  try {
    return await fn()
  } finally {
    activeGenerations--
    generationQueue.shift()?.()
  }
}

async function readCached(cachePath: string): Promise<Buffer | null> {
  try {
    const [buffer, stat] = await Promise.all([fs.promises.readFile(cachePath), fs.promises.stat(cachePath)])
    if (Date.now() - stat.mtimeMs > TOUCH_INTERVAL_MS) {
      const now = new Date()
      fs.promises.utimes(cachePath, now, now).catch(() => undefined)
    }
    return buffer
  } catch {
    return null
  }
}

async function writeCached(cachePath: string, buffer: Buffer): Promise<void> {
  // Write then rename so a crash never leaves a truncated thumbnail behind.
  const temporaryPath = `${cachePath}.${process.pid}.tmp`
  try {
    await fs.promises.writeFile(temporaryPath, buffer)
    await fs.promises.rename(temporaryPath, cachePath)
  } catch (error) {
    fs.promises.unlink(temporaryPath).catch(() => undefined)
    console.error('[thumbnails] failed to cache:', cachePath, error)
    return
  }
  if (++writesSincePrune >= PRUNE_EVERY_N_WRITES) {
    writesSincePrune = 0
    void pruneThumbnailCache()
  }
}

/**
 * Returns a WebP thumbnail for an image, generating and caching it on first use.
 * Throws if the source can't be decoded; callers should fall back to the original file.
 */
export async function getThumbnail(sourcePath: string, size: number, mtimeMs: number): Promise<Buffer> {
  const key = cacheKey(sourcePath, size, mtimeMs)
  const pending = inFlight.get(key)
  if (pending) return pending

  const promise = (async () => {
    const cachePath = path.join(getCacheDirectory(), `${key}.webp`)
    const cached = await readCached(cachePath)
    if (cached) return cached

    const buffer = await withGenerationSlot(() =>
      sharp(sourcePath)
        .rotate() // Apply EXIF orientation.
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
    )
    void writeCached(cachePath, buffer)
    return buffer
  })()

  inFlight.set(key, promise)
  try {
    return await promise
  } finally {
    inFlight.delete(key)
  }
}

/**
 * Deletes thumbnails unused for MAX_AGE_MS, then the least recently used ones until the
 * cache fits in MAX_CACHE_BYTES. Runs at startup and periodically as thumbnails are written.
 */
export async function pruneThumbnailCache(): Promise<void> {
  if (isPruning) return
  isPruning = true
  try {
    const directory = getCacheDirectory()
    const names = await fs.promises.readdir(directory)
    const files: Array<{ filePath: string; size: number; mtimeMs: number }> = []
    for (const name of names) {
      const filePath = path.join(directory, name)
      try {
        const stat = await fs.promises.stat(filePath)
        if (stat.isFile()) files.push({ filePath, size: stat.size, mtimeMs: stat.mtimeMs })
      } catch {
        // Removed while scanning.
      }
    }

    const now = Date.now()
    let totalBytes = files.reduce((sum, file) => sum + file.size, 0)
    files.sort((a, b) => a.mtimeMs - b.mtimeMs) // Least recently used first.
    for (const file of files) {
      const isExpired = now - file.mtimeMs > MAX_AGE_MS
      if (!isExpired && totalBytes <= MAX_CACHE_BYTES) break
      try {
        await fs.promises.unlink(file.filePath)
        totalBytes -= file.size
      } catch {
        // In use or already gone; try again next prune.
      }
    }
  } catch (error) {
    console.error('[thumbnails] prune failed:', error)
  } finally {
    isPruning = false
  }
}
