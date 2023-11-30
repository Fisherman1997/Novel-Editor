import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
// import icon from '../../resources/icon.png?asset'
  
// ipcMain.on('new-window', (event, url) => {  
//   event || event
//   const win = new BrowserWindow({
//     width: 1200,
//     height: 670,
//     show: false,
//     autoHideMenuBar: true,
//     ...(process.platform === 'linux' ? { icon } : {}),
//     webPreferences: {
//       sandbox: false,
//     }
//   })  
//   win.loadURL(url)  
// })

// Custom APIs for renderer
const api = {
  // newWin: (url: string) => {
  //   ipcRenderer.send('new-window', url)
  // }
}
// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
