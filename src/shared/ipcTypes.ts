export interface ImageItem {
  id: string
  name: string
  path: string
  mtime: number
  birthtime: number
  tags: string[]
}

export interface IpcResult {
  ok: boolean
  errors: string[]
}

export interface TagSaveRequest {
  imagePath: string
  tags: string[]
}

export interface RenameRequest {
  oldPath: string
  newName: string
}

export interface RenameResult extends RenameRequest {
  newPath: string
  ok: boolean
  error?: string
}

export interface MoveResult {
  ok: boolean
  errors: string[]
  moved: Array<{ oldPath: string; newPath: string }>
}
