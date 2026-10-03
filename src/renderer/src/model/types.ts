import type { AppOperationsApi } from '../../../shared/appApi'

export type {
  ImageItem,
  IpcResult,
  MoveResult,
  OperationProgress,
  RenameRequest,
  RenameResult,
  TagSaveRequest
} from '../../../shared/ipcTypes'

export type SortField = 'name' | 'mtime' | 'birthtime' | 'custom' | 'elo'
export type SortDir = 'asc' | 'desc'
export type KeepTossDecision = 'keep' | 'toss'

export interface WorkProgress {
  label: string
  done: number
  total: number
}

interface RendererApi extends AppOperationsApi {
  getPathForFile: (file: File) => string
}

declare global {
  interface Window {
    api: RendererApi
  }
}
