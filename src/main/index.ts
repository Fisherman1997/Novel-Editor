import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import ipcMainAll from './ipcMain'


function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1380,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    icon: join(__dirname,'../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // http
    }  
  })
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })
  
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })  
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((ds, callback) => {
    const { requestHeaders } = ds
    requestHeaders['Content-Security-Policy'] = 'default-src *'
    callback({requestHeaders})
  })
  
  // ServiceWorkers.webRequest.onBeforeRequest()
  // webContents.session
}
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  ipcMainAll()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
