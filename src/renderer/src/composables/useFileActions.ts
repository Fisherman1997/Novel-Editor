import { useMainStore, useNovelStore } from '../store'
import { parseAndMigrate, createBackupPath } from '@shared/migration'
import { showSuccess, showError, showWarning } from '../utils/errorHandler'
import { ElMessageBox } from 'element-plus'

// 文件操作（打开 / 保存 / 新建 / 启动加载），供欢迎页与侧栏共用
export function useFileActions() {
  const mainStore = useMainStore()
  const novelStore = useNovelStore()

  const removeRecentFile = (filePath: string) => {
    mainStore.removeRecentFile(filePath)
  }

  // 加载文件（含旧版格式迁移）
  const loadFile = async (filePath: string): Promise<boolean> => {
    const result = await window.api.readFile(filePath)
    if (!result.success || !result.data) {
      showError('读取文件失败: ' + (result.error || '未知错误'))
      return false
    }

    const parsed = parseAndMigrate(result.data)
    if (!parsed.success || !parsed.data) {
      showError(parsed.error || '解析文件失败')
      return false
    }

    novelStore.loadFromData(parsed.data)
    mainStore.setFileLoaded(true, filePath)
    mainStore.addRecentFile(filePath)
    mainStore.selectChapter(0, 0)

    // 旧版格式已自动迁移：备份原文件并把迁移结果写回
    if (parsed.migrated) {
      const backupResult = await window.api.writeFile(createBackupPath(filePath), result.data)
      const saveResult = await window.api.writeFile(filePath, novelStore.toJSON())
      if (backupResult.success && saveResult.success) {
        showSuccess('检测到旧版文件格式，已自动迁移，原文件已备份')
      } else {
        showWarning('文件已迁移到内存，但写回磁盘失败，请手动保存')
      }
    }
    return true
  }

  // 打开文件（系统选择框）
  const openFile = async (): Promise<void> => {
    const result = await window.api.selectFile(mainStore.recentFiles[0] || '')
    if (result.success && result.data) {
      await loadFile(result.data)
    }
  }

  // 保存文件
  const saveFile = async (): Promise<boolean> => {
    if (!mainStore.currentFilePath) return false

    const result = await window.api.writeFile(mainStore.currentFilePath, novelStore.toJSON())
    if (result.success) {
      mainStore.markSaved()
      return true
    }
    showError('保存失败: ' + (result.error || '未知错误'))
    return false
  }

  // 创建新书（初始化数据并落盘）
  const createNewBook = async (name: string, dirPath: string): Promise<boolean> => {
    novelStore.initNovel(name)

    const filePath = `${dirPath}/${name}.xstxt`
    const saveResult = await window.api.writeFile(filePath, novelStore.toJSON())
    if (!saveResult.success) {
      showError('创建文件失败: ' + (saveResult.error || '未知错误'))
      return false
    }

    mainStore.setFileLoaded(true, filePath)
    mainStore.addRecentFile(filePath)
    mainStore.selectChapter(0, 0)

    // 默认创建第一卷和第一个章节
    novelStore.addVolume()
    novelStore.addChapter(0)
    return true
  }

  // 启动：优先加载双击打开的目标文件，其次加载最近文件
  const loadStartupOrRecentFile = async (): Promise<void> => {
    let startupFile: string | null = null
    try {
      startupFile = await window.api.getStartupFile()
    } catch {
      startupFile = null
    }

    if (startupFile) {
      await loadFile(startupFile)
    } else if (mainStore.recentFiles.length > 0) {
      await loadFile(mainStore.recentFiles[0])
    }
  }

  // 关闭窗口前的保存询问；返回 false 表示用户取消了关闭
  const confirmCloseWithSave = async (): Promise<boolean> => {
    if (!mainStore.isDirty) return true

    try {
      await ElMessageBox.confirm('当前文件有未保存的更改，是否保存后关闭？', '未保存的更改', {
        distinguishCancelAndClose: true,
        confirmButtonText: '保存并关闭',
        cancelButtonText: '不保存',
        type: 'warning'
      })
      await saveFile()
      return true
    } catch (action) {
      if (action === 'cancel') {
        // 用户选择放弃更改：清除脏标记，否则 beforeunload 会阻止窗口关闭
        mainStore.markSaved()
        return true
      }
      // close = 留在应用
      return false
    }
  }

  return {
    loadFile,
    openFile,
    saveFile,
    createNewBook,
    loadStartupOrRecentFile,
    confirmCloseWithSave,
    removeRecentFile
  }
}
