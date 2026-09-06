import { v4 as uuidv4 } from 'uuid'
import {
  NovelData,
  Volume,
  Chapter,
  Character,
  WorldView,
  Annotation
} from './types'

// 旧版数据结构
interface OldNovelData {
  name: string
  volume?: Array<{
    volumeName: string
    volumeSummary?: string
    chapterList: Array<{
      chapterName: string
      chapterSummary?: string
      list: string[] | string
    }>
  }>
  volumes?: Array<{
    volumeName: string
    volumeSummary?: string
    chapters: Array<{
      chapterName: string
      chapterSummary?: string
      content: string
      annotations?: any[]
    }>
  }>
  character?: Array<{
    name: string
    personality: string
    appearance: string
    ageOfAppearance: string
    content: string
  }>
  characters?: Array<{
    id?: string
    name: string
    personality: string
    appearance: string
    ageOfAppearance: string
    content: string
  }>
  worldView?: Array<{
    name: string
    setting: string[]
    content: string
  }>
  worldViews?: Array<{
    id?: string
    name: string
    settings?: string[]
    setting?: string[]
    content: string
  }>
}

// 数据版本
export const CURRENT_VERSION = 3

// 检查是否需要迁移
export function needsMigration(data: any): boolean {
  if (!data) return false

  // 检查是否有旧版字段
  if (data.volume && !data.volumes) return true
  if (data.character && !data.characters) return true
  if (data.worldView && !data.worldViews) return true

  // 检查版本号
  if (!data._version || data._version < CURRENT_VERSION) return true

  return false
}

// 迁移数据
export function migrateData(data: OldNovelData): NovelData {
  console.log('开始数据迁移...')

  const migrated: NovelData = {
    name: data.name || '未命名',
    volumes: migrateVolumes(data),
    characters: migrateCharacters(data),
    worldViews: migrateWorldViews(data)
  }

  // 添加版本号
  ;(migrated as any)._version = CURRENT_VERSION

  console.log('数据迁移完成')
  return migrated
}

// 迁移卷和章节
function migrateVolumes(data: OldNovelData): Volume[] {
  // 优先使用新版字段
  if (data.volumes && Array.isArray(data.volumes)) {
    return data.volumes.map(vol => ({
      volumeName: vol.volumeName || '未命名',
      volumeSummary: vol.volumeSummary || '',
      chapters: vol.chapters.map(ch => migrateChapter(ch))
    }))
  }

  // 迁移旧版字段
  if (data.volume && Array.isArray(data.volume)) {
    return data.volume.map(vol => ({
      volumeName: vol.volumeName || '未命名',
      volumeSummary: vol.volumeSummary || '',
      chapters: vol.chapterList.map(ch => migrateChapter(ch))
    }))
  }

  return []
}

// 迁移章节
function migrateChapter(chapter: any): Chapter {
  let content = ''

  // 处理不同的内容格式
  if (chapter.content !== undefined) {
    // 新版格式
    content = chapter.content || ''
  } else if (chapter.list !== undefined) {
    // 旧版格式：list 可能是字符串数组或字符串
    if (Array.isArray(chapter.list)) {
      content = chapter.list.join('\n')
    } else if (typeof chapter.list === 'string') {
      content = chapter.list
    }
  }

  // 迁移标注
  const annotations = migrateAnnotations(chapter.annotations || [])

  return {
    chapterName: chapter.chapterName || '未命名',
    chapterSummary: chapter.chapterSummary || '',
    content,
    annotations
  }
}

// 迁移标注
function migrateAnnotations(annotations: any[]): Annotation[] {
  if (!Array.isArray(annotations)) return []

  return annotations.map(ann => ({
    id: ann.id || uuidv4(),
    type: ann.type || 'note',
    startOffset: ann.startOffset || 0,
    endOffset: ann.endOffset || 0,
    content: ann.content || '',
    color: ann.color,
    linkedCharacterId: ann.linkedCharacterId,
    linkedChapter: ann.linkedChapter,
    createdAt: ann.createdAt || Date.now(),
    updatedAt: ann.updatedAt || Date.now()
  }))
}

// 迁移人物
function migrateCharacters(data: OldNovelData): Character[] {
  // 优先使用新版字段
  if (data.characters && Array.isArray(data.characters)) {
    return data.characters.map(char => ({
      id: char.id || uuidv4(),
      name: char.name || '未命名',
      personality: char.personality || '',
      appearance: char.appearance || '',
      ageOfAppearance: char.ageOfAppearance || '',
      content: char.content || ''
    }))
  }

  // 迁移旧版字段
  if (data.character && Array.isArray(data.character)) {
    return data.character.map(char => ({
      id: uuidv4(),
      name: char.name || '未命名',
      personality: char.personality || '',
      appearance: char.appearance || '',
      ageOfAppearance: char.ageOfAppearance || '',
      content: char.content || ''
    }))
  }

  return []
}

// 迁移世界观
function migrateWorldViews(data: OldNovelData): WorldView[] {
  // 优先使用新版字段
  if (data.worldViews && Array.isArray(data.worldViews)) {
    return data.worldViews.map(wv => ({
      id: wv.id || uuidv4(),
      name: wv.name || '未命名',
      settings: wv.settings || wv.setting || [],
      content: wv.content || ''
    }))
  }

  // 迁移旧版字段
  if (data.worldView && Array.isArray(data.worldView)) {
    return data.worldView.map(wv => ({
      id: uuidv4(),
      name: wv.name || '未命名',
      settings: wv.setting || [],
      content: wv.content || ''
    }))
  }

  return []
}

// 验证迁移后的数据
export function validateMigratedData(data: NovelData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.name || typeof data.name !== 'string') {
    errors.push('书名无效')
  }

  if (!Array.isArray(data.volumes)) {
    errors.push('卷数据无效')
  } else {
    data.volumes.forEach((vol, vi) => {
      if (!vol.volumeName) {
        errors.push(`第 ${vi + 1} 卷缺少名称`)
      }
      if (!Array.isArray(vol.chapters)) {
        errors.push(`第 ${vi + 1} 卷的章节数据无效`)
      }
    })
  }

  if (!Array.isArray(data.characters)) {
    errors.push('人物数据无效')
  }

  if (!Array.isArray(data.worldViews)) {
    errors.push('世界观数据无效')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// 生成备份文件路径（真正的备份复制由调用方完成，例如渲染进程通过 IPC 写入）
export function createBackupPath(filePath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return filePath.replace(/\.xstxt$/i, `.backup-${timestamp}.xstxt`)
}

// 解析并迁移文件内容
export function parseAndMigrate(fileContent: string): {
  success: boolean
  data?: NovelData
  error?: string
  migrated?: boolean
} {
  try {
    // 解析 JSON
    const rawData = JSON.parse(fileContent)

    // 检查是否需要迁移
    if (needsMigration(rawData)) {
      console.log('检测到旧版数据格式，开始迁移...')

      // 迁移数据
      const migratedData = migrateData(rawData)

      // 验证迁移结果
      const validation = validateMigratedData(migratedData)
      if (!validation.valid) {
        return {
          success: false,
          error: `数据迁移失败: ${validation.errors.join(', ')}`
        }
      }

      return {
        success: true,
        data: migratedData,
        migrated: true
      }
    }

    // 直接返回数据
    return {
      success: true,
      data: rawData as NovelData,
      migrated: false
    }
  } catch (error) {
    return {
      success: false,
      error: `解析文件失败: ${(error as Error).message}`
    }
  }
}
