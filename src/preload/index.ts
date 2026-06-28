import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  loadImages: (paths: string[]) => ipcRenderer.invoke('images:load', paths),

  trashImages: (paths: string[]) => ipcRenderer.invoke('images:trash', paths),

  touchImages: (paths: string[]) => ipcRenderer.invoke('images:touch', paths),

  confirm: (message: string) => ipcRenderer.invoke('dialog:confirm', message),

  renameImages: (renames: Array<{oldPath: string, newName: string}>) =>
    ipcRenderer.invoke('images:rename', renames),

  saveTags: (saves: Array<{imagePath: string, tags: string[]}>) =>
    ipcRenderer.invoke('tags:save', saves)
})
