import { registerDialogHandlers } from './dialogHandlers'
import { registerImageHandlers } from './imageHandlers'
import { registerTagHandlers } from './tagHandlers'

export function registerIpcHandlers(): void {
  registerImageHandlers()
  registerTagHandlers()
  registerDialogHandlers()
}
