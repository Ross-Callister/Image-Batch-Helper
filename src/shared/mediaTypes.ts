export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const
export const VIDEO_EXTENSIONS = ['.mp4', '.webm'] as const

function extensionOf(filePath: string): string {
  const dotIndex = filePath.lastIndexOf('.')
  const slashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return dotIndex > slashIndex ? filePath.slice(dotIndex).toLowerCase() : ''
}

export function isVideoPath(filePath: string): boolean {
  return (VIDEO_EXTENSIONS as readonly string[]).includes(extensionOf(filePath))
}

export function isMediaPath(filePath: string): boolean {
  const extension = extensionOf(filePath)
  return (
    (IMAGE_EXTENSIONS as readonly string[]).includes(extension) ||
    (VIDEO_EXTENSIONS as readonly string[]).includes(extension)
  )
}
