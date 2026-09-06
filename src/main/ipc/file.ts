import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFileSync, writeFile, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { FileResult, ExportConfig, Character, WorldView, Chapter, Volume } from '../../shared/types'
import { IPC_CHANNELS } from '../../shared/types'

// HTML 转纯文本
function htmlToPlainText(html: string): string {
  if (!html) return ''

  // 移除 HTML 标签，保留内容
  let text = html
    // 移除 script 和 style 标签
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // 块级标签转换为换行
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    // 移除所有其他标签
    .replace(/<[^>]+>/g, '')
    // 解码 HTML 实体
    .replace(/&nbsp;/g, '　')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // 清理多余空行
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // 添加首行缩进（中文排版习惯）
  text = text
    .split('\n')
    .map(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('　')) {
        return '　　' + trimmed
      }
      return trimmed
    })
    .join('\n')

  return text
}

// 格式化人物导出内容
function formatCharacter(character: Character): string {
  return [
    `姓名：${character.name}`,
    `性格：${character.personality || '未填写'}`,
    `长相：${character.appearance || '未填写'}`,
    `出现年龄：${character.ageOfAppearance || '未填写'}`,
    ``,
    `详细描述：`,
    character.content || '未填写'
  ].join('\n')
}

// 格式化世界观导出内容
function formatWorldView(worldView: WorldView): string {
  const parts: string[] = []

  if (worldView.settings && worldView.settings.length > 0) {
    parts.push('设定要点：')
    worldView.settings.forEach((s, i) => {
      parts.push(`${i + 1}. ${s}`)
    })
    parts.push('')
  }

  parts.push('详细描述：')
  parts.push(worldView.content || '未填写')

  return parts.join('\n')
}

// 格式化章节导出内容
function formatChapter(chapter: Chapter, includeSummary: boolean = true, convertToPlainText: boolean = true): string {
  const parts: string[] = []

  parts.push(`【${chapter.chapterName}】`)
  parts.push('')

  if (includeSummary && chapter.chapterSummary) {
    parts.push(`【章说明】${chapter.chapterSummary}`)
    parts.push('')
  }

  const content = convertToPlainText ? htmlToPlainText(chapter.content) : chapter.content
  parts.push(content)

  return parts.join('\n')
}

// 格式化卷导出内容（包含所有章节）
function formatVolume(volume: Volume, includeSummary: boolean = true, convertToPlainText: boolean = true): string {
  const parts: string[] = []

  // 卷标题
  parts.push(`═`.repeat(40))
  parts.push(`  ${volume.volumeName}`)
  parts.push(`═`.repeat(40))
  parts.push('')

  // 卷说明（可选）
  if (includeSummary && volume.volumeSummary) {
    parts.push(`【卷说明】${volume.volumeSummary}`)
    parts.push('')
  }

  // 所有章节
  volume.chapters.forEach((chapter) => {
    parts.push(formatChapter(chapter, includeSummary, convertToPlainText))
    parts.push('')
    parts.push('─'.repeat(30))
    parts.push('')
  })

  return parts.join('\n')
}

// 通用函数：异步写文件，返回 { success, error? }
const writeFileAsync = (filePath: string, data: string): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    writeFile(filePath, data, 'utf-8', (err) => {
      if (err) resolve({ success: false, error: `${filePath}: ${err.message}` })
      else resolve({ success: true })
    })
  })
}

// 通用函数：确保文件夹存在
const ensureDir = (dirPath: string) => {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true })
}

export function registerFileHandlers(): void {
  // 读取文件
  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_event, filePath: string): Promise<FileResult> => {
    try {
      const content = readFileSync(filePath, 'utf-8')
      return { success: true, data: content }
    } catch (error) {
      console.error('读取文件失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 写入文件
  ipcMain.handle(IPC_CHANNELS.FILE_WRITE, async (_event, filePath: string, data: string): Promise<FileResult> => {
    try {
      if (!filePath.endsWith('.xstxt')) {
        return { success: false, error: '文件格式错误，仅支持 .xstxt 格式' }
      }

      const success = await writeFileAsync(filePath, data)
      if (success) {
        return { success: true }
      } else {
        return { success: false, error: '写入文件失败' }
      }
    } catch (error) {
      console.error('写入文件失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 选择文件或目录
  ipcMain.handle(IPC_CHANNELS.FILE_SELECT, async (event, defaultPath: string, type: 'file' | 'dir'): Promise<FileResult> => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) {
        return { success: false, error: '无法获取窗口' }
      }

      const result = await dialog.showOpenDialog(win, {
        title: type === 'dir' ? '选择目录' : '选择文件',
        defaultPath: defaultPath || undefined,
        properties: type === 'dir' ? ['openDirectory'] : ['openFile'],
        filters: type === 'file' ? [{ name: '小说文件', extensions: ['xstxt'] }] : []
      })

      if (result.canceled || !result.filePaths[0]) {
        return { success: false, error: '未选择文件' }
      }

      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      console.error('选择文件失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 导出小说
  ipcMain.handle(IPC_CHANNELS.FILE_EXPORT, async (_event, config: ExportConfig): Promise<FileResult> => {
    try {
      if (!config || !config.path || !config.data) {
        return { success: false, error: '导出配置不完整' }
      }

      const { type, path: exportPath, data, volumeIndex, chapterIndex } = config
      const includeSummary = config.includeSummary ?? true
      const convertToPlainText = config.convertToPlainText ?? true
      const baseDir = join(exportPath, data.name)
      const exportPromises: Promise<{ success: boolean; error?: string }>[] = []

      ensureDir(baseDir)

      if (type === 'all') {
        ensureDir(join(baseDir, '人物'))
        ensureDir(join(baseDir, '设定'))

        data.characters.forEach((character) => {
          exportPromises.push(
            writeFileAsync(join(baseDir, '人物', `${character.name}.txt`), formatCharacter(character))
          )
        })

        data.worldViews.forEach((worldView) => {
          exportPromises.push(
            writeFileAsync(join(baseDir, '设定', `${worldView.name}.txt`), formatWorldView(worldView))
          )
        })

        data.volumes.forEach((volume) => {
          const volumePath = join(baseDir, `${volume.volumeName}.txt`)
          exportPromises.push(writeFileAsync(volumePath, formatVolume(volume, includeSummary, convertToPlainText)))
        })
      }

      if (type === 'volume' && volumeIndex !== undefined) {
        const volume = data.volumes[volumeIndex]
        if (!volume) {
          return { success: false, error: '未找到指定的卷' }
        }

        const volumeDir = join(baseDir, volume.volumeName)
        ensureDir(volumeDir)
        ensureDir(join(volumeDir, '人物'))
        ensureDir(join(volumeDir, '设定'))

        data.characters.forEach((character) => {
          exportPromises.push(
            writeFileAsync(join(volumeDir, '人物', `${character.name}.txt`), formatCharacter(character))
          )
        })

        data.worldViews.forEach((worldView) => {
          exportPromises.push(
            writeFileAsync(join(volumeDir, '设定', `${worldView.name}.txt`), formatWorldView(worldView))
          )
        })

        exportPromises.push(
          writeFileAsync(join(volumeDir, `${volume.volumeName}.txt`), formatVolume(volume, includeSummary, convertToPlainText))
        )
      }

      if (type === 'chapter' && volumeIndex !== undefined && chapterIndex !== undefined) {
        const volume = data.volumes[volumeIndex]
        const chapter = volume?.chapters[chapterIndex]
        if (!volume || !chapter) {
          return { success: false, error: '未找到指定的章节' }
        }

        const chapterPath = join(baseDir, `${chapter.chapterName}.txt`)
        exportPromises.push(writeFileAsync(chapterPath, formatChapter(chapter, includeSummary, convertToPlainText)))
      }

      const results = await Promise.all(exportPromises)
      const failed = results.filter(r => !r.success)

      if (failed.length === 0) {
        return { success: true }
      } else {
        const errorDetail = failed.map(r => r.error).filter(Boolean).join('\n')
        console.error('部分文件导出失败:', errorDetail)
        return { success: false, error: `${failed.length} 个文件导出失败:\n${errorDetail}` }
      }
    } catch (error) {
      console.error('导出失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })
}


