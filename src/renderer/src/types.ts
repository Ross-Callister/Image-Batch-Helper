export interface ImageItem {
  id: string
  name: string
  path: string
  mtime: number
  birthtime: number
  tags: string[]
}

export type SortField = 'name' | 'mtime' | 'birthtime' | 'custom' | 'elo'
export type SortDir = 'asc' | 'desc'

export interface IpcResult {
  ok: boolean
  errors: string[]
}

declare global {
  interface Window {
    api: {
      getPathForFile: (file: File) => string
      loadImages: (paths: string[]) => Promise<ImageItem[]>
      trashImages: (paths: string[]) => Promise<IpcResult>
      touchImages: (paths: string[]) => Promise<IpcResult>
      confirm: (message: string) => Promise<boolean>
      renameImages: (
        renames: Array<{oldPath: string, newName: string}>
      ) => Promise<Array<{oldPath: string, newName: string, newPath: string, ok: boolean, error?: string}>>
      saveTags: (saves: Array<{imagePath: string, tags: string[]}>) => Promise<IpcResult>
    }
  }
}
