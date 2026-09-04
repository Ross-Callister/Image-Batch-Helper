import type {
  ImageItem,
  IpcResult,
  MoveResult,
  RenameRequest,
  RenameResult,
  TagSaveRequest
} from './ipcTypes'

export interface AppOperationsApi {
  loadImages: (paths: string[]) => Promise<ImageItem[]>
  trashImages: (paths: string[]) => Promise<IpcResult>
  touchImages: (paths: string[]) => Promise<IpcResult>
  confirm: (message: string) => Promise<boolean>
  renameImages: (renames: RenameRequest[]) => Promise<RenameResult[]>
  saveTags: (saves: TagSaveRequest[]) => Promise<IpcResult>
  selectFolder: () => Promise<string | null>
  moveImages: (paths: string[], destinationFolder: string) => Promise<MoveResult>
}
