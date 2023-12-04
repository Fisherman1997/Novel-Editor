import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
// Custom APIs for renderer

type apiType = {
  newWin: (url: string) => void,
  changeWindow: (type: string) => void
}

const api: apiType = {
  newWin: (url) => {
    ipcRenderer.send('new-window', url)
  },
  changeWindow: (type) => {
    ipcRenderer.send(type)
  }
}

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
  window.api = api as apiType
}