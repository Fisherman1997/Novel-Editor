// 共享类型定义 - 主进程和渲染进程共用

// 窗口控制类型
export type WindowAction = 'close' | 'show' | 'hide' | 'maximize' | 'minimize' | 'restore'

// 文件操作结果
export interface FileResult {
  success: boolean
  data?: string
  error?: string
}

// 导出类型
export type ExportType = 'all' | 'volume' | 'chapter'

// 导出配置
export interface ExportConfig {
  type: ExportType
  path: string
  data: NovelData
  volumeIndex?: number    // 按卷导出时使用
  chapterIndex?: number   // 按章导出时使用
  includeSummary?: boolean      // 是否包含卷/章说明
  convertToPlainText?: boolean  // 是否将 HTML 内容转为纯文本
}

// 章节
export interface Chapter {
  chapterName: string
  chapterSummary?: string    // 章说明（可选）
  content: string
  annotations?: Annotation[]
}

// 册
export interface Volume {
  volumeName: string
  volumeSummary?: string     // 卷说明（可选）
  chapters: Chapter[]
}

// 人物
export interface Character {
  id: string
  name: string
  personality: string
  appearance: string
  ageOfAppearance: string
  content: string
}

// 世界观
export interface WorldView {
  id: string
  name: string
  settings: string[]
  content: string
}

// 标注类型
export type AnnotationType = 'note' | 'link' | 'highlight'

// 标注
export interface Annotation {
  id: string
  type: AnnotationType
  // 旧版（偏移量方案）遗留字段：新版标注以 Tiptap mark 内嵌于正文 HTML，
  // 范围以 mark 为准，这里仅在兼容旧数据时存在
  startOffset?: number
  endOffset?: number
  content: string
  color?: string
  linkedCharacterId?: string
  linkedChapter?: { volumeIndex: number; chapterIndex: number }
  createdAt: number
  updatedAt: number
}

// 小说数据
export interface NovelData {
  name: string
  volumes: Volume[]
  characters: Character[]
  worldViews: WorldView[]
}

// 编辑器状态
export interface EditorState {
  content: string
  cursorPosition: number
  selection: { from: number; to: number } | null
}

// 搜索选项
export interface SearchOptions {
  caseSensitive: boolean
  wholeWord: boolean
  useRegex: boolean
  scope: 'current' | 'all'
}

// 搜索结果
export interface SearchResult {
  volumeIndex: number
  chapterIndex: number
  chapterName: string
  matchText: string
  position: number  // 在章节纯文本（所有文本节点拼接）中的偏移
  length: number
}

// 自动保存配置
export interface AutoSaveConfig {
  enabled: boolean
  interval: number  // 毫秒
  delay: number     // 内容变化后延迟保存的毫秒数
}

// 编辑器配置
export interface EditorConfig {
  fontSize: number
  fontFamily: string
  fontColor: string
  backgroundColor: string
  lineHeight: number
  rightPanelWidth: number
}

// 应用配置
export interface AppConfig {
  editor: EditorConfig
  autoSave: AutoSaveConfig
  recentFiles: string[]
  maxRecentFiles: number
}

// IPC 通道名称
export const IPC_CHANNELS = {
  // 文件操作
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_SELECT: 'file:select',
  FILE_EXPORT: 'file:export',

  // 窗口控制
  WINDOW_CONTROL: 'window:control',

  // 系统
  SYSTEM_DESKTOP_PATH: 'system:desktopPath',
  SYSTEM_STARTUP_FILE: 'system:startupFile',

  // 事件
  FILE_OPEN: 'file:open'
} as const
