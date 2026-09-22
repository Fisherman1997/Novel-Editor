import { ipcMain, app, BrowserWindow } from 'electron'
import { resolve } from 'path'
import { IPC_CHANNELS } from '../../shared/types'

export function registerSystemHandlers(): void {
    // 获取桌面路径
    ipcMain.handle(IPC_CHANNELS.SYSTEM_DESKTOP_PATH, () => {
        return app.getPath('desktop')
    })

    // 获取启动时的文件参数
    ipcMain.handle(IPC_CHANNELS.SYSTEM_STARTUP_FILE, () => {
        const args = process.argv.slice(1)
        const fileToOpen = args.find((arg) => arg.endsWith('.xstxt'))
        return fileToOpen || null
    })
}

// 发送文件打开事件到渲染进程
export function sendFileOpenEvent(filePath: string): void {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
        mainWindow.webContents.send(IPC_CHANNELS.FILE_OPEN, resolve(filePath))
    }
}
