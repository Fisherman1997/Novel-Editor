import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
// Custom APIs for renderer
type controlWindowType = 'close' | 'show' | 'hide' | 'maximize' | 'minimize' | 'restore'

interface ApiType {
    newWin(url: string): void
    changeWindow: (type: controlWindowType) => void
    desktopPath: () => Promise<string>
}

const api: ApiType = {
    newWin: (url) => {
        ipcRenderer.send('new-window', url)
    },
    changeWindow: (type) => {
        ipcRenderer.send(type)
    },
    desktopPath: async () => {
        return await ipcRenderer.invoke('desktopPath') as string
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
    window.api = api as ApiType
}
