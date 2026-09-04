import type { ImageItem, RenameRequest } from './types'

export function createRenameRequests(images: ImageItem[], baseName: string): RenameRequest[] {
  const trimmedBaseName = baseName.trim()
  const digits = Math.max(3, String(images.length).length)

  return images.map((image, index) => {
    const extensionIndex = image.name.lastIndexOf('.')
    const extension = extensionIndex !== -1 ? image.name.slice(extensionIndex) : ''
    const sequence = String(index + 1).padStart(digits, '0')
    return { oldPath: image.path, newName: `${trimmedBaseName}_${sequence}${extension}` }
  })
}
