import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  loadImages: (paths: string[]) => ipcRenderer.invoke('images:load', paths),

  trashImages: (paths: string[]) => ipcRenderer.invoke('images:trash', paths),

  touchImages: (paths: string[]) => ipcRenderer.invoke('images:touch', paths),

  confirm: (message: string) => ipcRenderer.invoke('dialog:confirm', message)
})
