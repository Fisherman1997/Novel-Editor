import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, dialog, app, ipcMain } from 'electron'

// 更新状态
interface UpdateState {
  isChecking: boolean
  isDownloading: boolean
  updateInfo: UpdateInfo | null
  error: string | null
}

const state: UpdateState = {
  isChecking: false,
  isDownloading: false,
  updateInfo: null,
  error: null
}

// 记录已提示过的版本，避免每 4 小时重复弹窗
let lastPromptedVersion: string | null = null

// 发送更新状态到渲染进程
function sendUpdateStatus(status: Partial<UpdateState>): void {
  Object.assign(state, status)

  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', state)
  }
}

// 检查更新
async function checkForUpdates(): Promise<void> {
  if (state.isChecking) return

  try {
    sendUpdateStatus({ isChecking: true, error: null })

    const update = await autoUpdater.checkForUpdates()

    if (update) {
      sendUpdateStatus({ updateInfo: update.updateInfo })

      // 同版本不重复弹窗
      if (update.updateInfo.version === lastPromptedVersion) {
        sendUpdateStatus({ isChecking: false })
        return
      }

      const response = await dialog.showMessageBox({
        type: 'info',
        title: '发现新版本',
        message: `发现新版本 ${update.updateInfo.version}，是否下载更新？`,
        buttons: ['立即更新', '稍后更新'],
        defaultId: 0,
        cancelId: 1
      })

      lastPromptedVersion = update.updateInfo.version

      if (response.response === 0) {
        await downloadUpdate()
      }
    } else {
      sendUpdateStatus({ updateInfo: null })
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    sendUpdateStatus({ error: (error as Error).message })
  } finally {
    sendUpdateStatus({ isChecking: false })
  }
}

// 下载更新
async function downloadUpdate(): Promise<void> {
  if (state.isDownloading || !state.updateInfo) return

  try {
    sendUpdateStatus({ isDownloading: true, error: null })

    await autoUpdater.downloadUpdate()

    const response = await dialog.showMessageBox({
      type: 'info',
      title: '更新下载完成',
      message: '更新已下载完成，是否立即安装并重启？',
      buttons: ['立即安装', '稍后安装'],
      defaultId: 0,
      cancelId: 1
    })

    if (response.response === 0) {
      autoUpdater.quitAndInstall()
    }
  } catch (error) {
    console.error('下载更新失败:', error)
    sendUpdateStatus({ error: (error as Error).message })
  } finally {
    sendUpdateStatus({ isDownloading: false })
  }
}

// 设置自动更新
export function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // 监听渲染进程的更新请求（无论 dev 还是 prod 都注册，避免通道不可达）
  ipcMain.on('update:check', () => { checkForUpdates() })
  ipcMain.on('update:download', () => { downloadUpdate() })
  ipcMain.on('update:install', () => { autoUpdater.quitAndInstall() })

  // 监听 autoUpdater 事件（只在全局注册一次，downloadUpdate 内不再重复）
  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ isChecking: true })
  })

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({ updateInfo: info })
  })

  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({ updateInfo: null })
  })

  autoUpdater.on('error', (error) => {
    console.error('自动更新错误:', error)
    sendUpdateStatus({ error: error.message })
  })

  autoUpdater.on('download-progress', (progress) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total
      })
    }
  })

  autoUpdater.on('update-downloaded', () => {
    sendUpdateStatus({ isDownloading: false })
  })

  // 开发环境下禁用自动检查
  if (process.env.NODE_ENV === 'development') {
    console.log('开发环境下禁用自动更新检查')
    return
  }

  app.whenReady().then(() => {
    setTimeout(() => { checkForUpdates() }, 5000)
  })

  // 定期检查更新（每4小时）
  setInterval(() => { checkForUpdates() }, 4 * 60 * 60 * 1000)

  console.log('自动更新已配置')
}

export { checkForUpdates, downloadUpdate }
