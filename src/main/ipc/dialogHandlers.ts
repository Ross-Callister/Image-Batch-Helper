import { BrowserWindow, dialog, ipcMain } from 'electron'

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:confirm', async (_event, message: string) => {
    const window = BrowserWindow.getFocusedWindow()
    const result = await dialog.showMessageBox(window!, {
      type: 'warning',
      buttons: ['Replace', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      message: 'Replace images?',
      detail: message
    })
    return result.response === 0
  })

  ipcMain.handle('dialog:selectFolder', async () => {
    const window = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}
