import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join, resolve } from "path";
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import ipcMainAll from './ipcMain'

// 创建主窗口的函数
function createWindow(): BrowserWindow {
    const mainWindow = new BrowserWindow({
        width: 1380,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        frame: false,
        icon: join(__dirname, '../../resources/icon.png'),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    // 绑定窗口显示事件
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    // 拦截新窗口的请求，打开外部链接
    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url).then()
        return { action: 'deny' }
    })

    // 加载页面
    loadPage(mainWindow)

    // 设置请求头中的Content-Security-Policy
    mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
        const { requestHeaders } = details
        requestHeaders['Content-Security-Policy'] = 'default-src *'
        callback({ requestHeaders })
    })

    return mainWindow
}

// 加载页面的函数
function loadPage(mainWindow: BrowserWindow) {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).catch((err) => {
            console.error('Error loading URL:', err)
        })
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch((err) => {
            console.error('Error loading file:', err)
        })
    }
}


app.whenReady().then(() => {
    // 设置应用的用户模型 ID（用于 Windows 的任务栏图标）
    electronApp.setAppUserModelId('com.electron')

    // 监听浏览器窗口创建事件，优化窗口快捷键
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // 创建窗口并初始化 IPC
    const mainWindow = createWindow()
    ipcMainAll()

    ipcMain.handle("is_start_file",() => {
        const args = process.argv.slice(1);
        // const mainWindow = BrowserWindow.getFocusedWindow()
        const filePathToOpen = args.find(arg => arg.endsWith('.xstxt'))
        return Boolean(filePathToOpen)
    })

    ipcMain.on('chunk-file', () => {
        const args = process.argv.slice(1);
        // const mainWindow = BrowserWindow.getFocusedWindow()
        const filePathToOpen = args.find(arg => arg.endsWith('.xstxt'))
        if (filePathToOpen && mainWindow) {
            mainWindow.webContents.send("file-start", resolve(filePathToOpen))
        }
    })

    // macOS 上确保在没有窗口时重新创建窗口
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

// 监听所有窗口关闭事件，除非是 macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
