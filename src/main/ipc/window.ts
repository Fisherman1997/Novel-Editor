import { ipcMain, BrowserWindow } from 'electron'
import { WindowAction, IPC_CHANNELS } from '../../shared/types'

// 窗口控制
function controlWindow(action: WindowAction): void {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return

  switch (action) {
    case 'close':
      win.close()
      break
    case 'show':
      win.show()
      break
    case 'hide':
      win.hide()
      break
    case 'restore':
      win.restore()
      break
    case 'maximize':
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
      break
    case 'minimize':
      win.minimize()
      break
  }
}

export function registerWindowHandlers(): void {
  // 窗口控制
  ipcMain.on(IPC_CHANNELS.WINDOW_CONTROL, (_event, action: WindowAction) => {
    controlWindow(action)
  })
}
