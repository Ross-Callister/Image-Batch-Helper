import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import type { OperationProgress } from '../shared/ipcTypes'
import type { ImageBatchApi } from './apiTypes'

let nextRequestId = 0

const api: ImageBatchApi = {
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  loadImages: (paths: string[]) => ipcRenderer.invoke('images:load', paths),

  trashImages: async (paths, onProgress) => {
    if (!onProgress) return ipcRenderer.invoke('images:trash', paths)
    const requestId = nextRequestId++
    const listener = (_event: IpcRendererEvent, id: number, progress: OperationProgress) => {
      if (id === requestId) onProgress(progress)
    }
    ipcRenderer.on('images:trashProgress', listener)
    try {
      return await ipcRenderer.invoke('images:trash', paths, requestId)
    } finally {
      ipcRenderer.removeListener('images:trashProgress', listener)
    }
  },

  touchImages: (paths: string[]) => ipcRenderer.invoke('images:touch', paths),

  confirm: (message: string) => ipcRenderer.invoke('dialog:confirm', message),

  renameImages: (renames: Array<{oldPath: string, newName: string}>) =>
    ipcRenderer.invoke('images:rename', renames),

  saveTags: (saves: Array<{imagePath: string, tags: string[]}>) =>
    ipcRenderer.invoke('tags:save', saves),

  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

  moveImages: (paths: string[], destFolder: string) =>
    ipcRenderer.invoke('images:move', paths, destFolder)
}

contextBridge.exposeInMainWorld('api', api)
