import { ElectronAPI } from '@electron-toolkit/preload'
type controlWindowType = 'close' | 'show' | 'hide' | 'maximize' | 'minimize' | 'restore'

interface ApiType {
    newWin(url: string): void
    changeWindow: (type: controlWindowType) => void
    desktopPath: () => Promise<string>
}
declare global {
  interface Window {
    electron: ElectronAPI
    api: ApiType
  }
}
