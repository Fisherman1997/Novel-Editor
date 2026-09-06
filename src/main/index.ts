import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAllHandlers, sendFileOpenEvent } from './ipc'
import { logger, setupMainProcessErrorHandling } from './logger'
import { setupAutoUpdater } from './updater'

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
    logger.info('主窗口已显示')
  })

  // 拦截新窗口的请求，打开外部链接
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url).then()
    return { action: 'deny' }
  })

  // 加载页面
  loadPage(mainWindow)

  // Content-Security-Policy：禁止 inline script/object/embed，仅允许 style unsafe-inline（Element Plus 需要）
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = process.env.NODE_ENV === 'development'
      ? "default-src 'self' http://localhost:* https://localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
      : "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })

  // 监听渲染进程错误（Electron 17+ 废弃 'crashed'，改用 'render-process-gone'）
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error(`渲染进程异常退出: ${details.reason}`, 'MainProcess')
  })

  mainWindow.webContents.on('unresponsive', () => {
    logger.warn('渲染进程无响应', 'MainProcess')
  })

  return mainWindow
}

// 加载页面的函数
function loadPage(mainWindow: BrowserWindow): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).catch((err) => {
      logger.error('加载URL失败', 'MainProcess', err)
    })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch((err) => {
      logger.error('加载文件失败', 'MainProcess', err)
    })
  }
}

// 应用启动
app.whenReady().then(() => {
  // 设置主进程错误处理
  setupMainProcessErrorHandling()

  logger.info('应用启动', 'MainProcess', {
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    platform: process.platform,
    arch: process.arch
  })

  // 设置应用的用户模型 ID
  electronApp.setAppUserModelId('com.novel-editor.app')

  // 监听浏览器窗口创建事件，优化窗口快捷键
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 创建窗口并初始化 IPC
  const mainWindow = createWindow()
  registerAllHandlers()

  // 设置自动更新
  setupAutoUpdater()

  // 处理启动时的文件参数
  const args = process.argv.slice(1)
  const fileToOpen = args.find(arg => arg.endsWith('.xstxt'))
  if (fileToOpen) {
    logger.info('启动时打开文件', 'MainProcess', { file: fileToOpen })
    // 等待窗口加载完成后发送文件打开事件
    mainWindow.once('ready-to-show', () => {
      sendFileOpenEvent(fileToOpen)
    })
  }

  // macOS 上确保在没有窗口时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 监听所有窗口关闭事件，除非是 macOS
app.on('window-all-closed', () => {
  logger.info('应用关闭', 'MainProcess')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前
app.on('before-quit', () => {
  logger.info('应用即将退出', 'MainProcess')
})
