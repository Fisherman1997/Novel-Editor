import { defineStore } from 'pinia'
import { EditorConfig, AutoSaveConfig, AppConfig } from '@shared/types'

type ThemeMode = 'light' | 'dark'

interface MainState {
    // 文件状态
    isFileLoaded: boolean
    isDirty: boolean
    currentFilePath: string | null

    // 编辑器配置
    editor: EditorConfig

    // 自动保存配置
    autoSave: AutoSaveConfig

    // 最近文件
    recentFiles: string[]

    // 最近文件数量上限
    maxRecentFiles: number

    // 主题
    theme: ThemeMode

    // UI 状态
    selectedVolumeIndex: number
    selectedChapterIndex: number
    rightPanelWidth: number
    rightPanelTab: 'characters' | 'worldViews' | 'annotations' | 'assistant'
    leftPanelCollapsed: boolean
    rightPanelCollapsed: boolean

    // 最后保存时间
    lastSavedAt: number | null
}

// 右侧面板宽度范围（px）
export const RIGHT_PANEL_MIN_WIDTH = 200
export const RIGHT_PANEL_MAX_WIDTH = 600

const clampPanelWidth = (width: unknown): number => {
    const w = typeof width === 'number' && width > 0 ? width : 300
    return Math.min(RIGHT_PANEL_MAX_WIDTH, Math.max(RIGHT_PANEL_MIN_WIDTH, w))
}

const defaultConfig: AppConfig = {
    editor: {
        fontSize: 17,
        fontFamily: '默认',
        fontColor: '#1f2328',
        backgroundColor: '#ffffff',
        lineHeight: 30,
        rightPanelWidth: 320
    },
    autoSave: {
        enabled: true,
        interval: 30000, // 30秒
        delay: 5000 // 5秒
    },
    recentFiles: [],
    maxRecentFiles: 30
}

export const useMainStore = defineStore('main', {
    state: (): MainState => {
        // 尝试从 localStorage 恢复配置
        const saved = localStorage.getItem('app-config')
        const savedConfig = saved ? JSON.parse(saved) : defaultConfig

        return {
            isFileLoaded: false,
            isDirty: false,
            currentFilePath: null,

            editor: savedConfig.editor || defaultConfig.editor,
            autoSave: savedConfig.autoSave || defaultConfig.autoSave,
            recentFiles: savedConfig.recentFiles || [],
            maxRecentFiles: savedConfig.maxRecentFiles || defaultConfig.maxRecentFiles,
            theme: savedConfig.theme === 'dark' ? 'dark' : 'light',

            selectedVolumeIndex: 0,
            selectedChapterIndex: 0,
            rightPanelWidth: clampPanelWidth(
                savedConfig.editor?.rightPanelWidth ?? defaultConfig.editor.rightPanelWidth
            ),
            rightPanelTab: 'characters',
            leftPanelCollapsed: false,
            rightPanelCollapsed: false,

            lastSavedAt: null
        }
    },

    getters: {
        // 获取当前文件名
        currentFileName: (state): string => {
            if (!state.currentFilePath) return ''
            const parts = state.currentFilePath.split(/[/\\]/)
            return parts[parts.length - 1]
        },

        // 获取保存的配置
        getConfig: (state): AppConfig => ({
            editor: state.editor,
            autoSave: state.autoSave,
            recentFiles: state.recentFiles,
            maxRecentFiles: state.maxRecentFiles
        })
    },

    actions: {
        // 设置文件加载状态
        setFileLoaded(loaded: boolean, filePath?: string) {
            this.isFileLoaded = loaded
            if (filePath) {
                this.currentFilePath = filePath
            }
        },

        // 标记为已修改
        markDirty() {
            this.isDirty = true
        },

        // 标记为已保存
        markSaved() {
            this.isDirty = false
            this.lastSavedAt = Date.now()
        },

        // 添加最近文件
        addRecentFile(filePath: string) {
            // 移除重复项
            const index = this.recentFiles.indexOf(filePath)
            if (index > -1) {
                this.recentFiles.splice(index, 1)
            }

            // 添加到开头
            this.recentFiles.unshift(filePath)

            // 限制数量
            if (this.recentFiles.length > this.maxRecentFiles) {
                this.recentFiles.pop()
            }

            this.saveConfig()
        },

        // 移除最近文件
        removeRecentFile(filePath: string) {
            const index = this.recentFiles.indexOf(filePath)
            if (index > -1) {
                this.recentFiles.splice(index, 1)
                this.saveConfig()
            }
        },

        // 更新编辑器配置
        updateEditorConfig(config: Partial<EditorConfig>) {
            Object.assign(this.editor, config)
            this.saveConfig()
        },

        // 更新自动保存配置
        updateAutoSaveConfig(config: Partial<AutoSaveConfig>) {
            Object.assign(this.autoSave, config)
            this.saveConfig()
        },

        // 切换主题
        setTheme(theme: ThemeMode) {
            this.theme = theme
            this.saveConfig()
        },

        toggleTheme() {
            this.setTheme(this.theme === 'dark' ? 'light' : 'dark')
        },

        // 选择章节
        selectChapter(volumeIndex: number, chapterIndex: number) {
            this.selectedVolumeIndex = volumeIndex
            this.selectedChapterIndex = chapterIndex
        },

        // 更新右侧面板宽度
        updateRightPanelWidth(width: number) {
            this.rightPanelWidth = clampPanelWidth(width)
            this.saveConfig()
        },

        // 保存配置到 localStorage
        saveConfig() {
            const config: AppConfig & { theme?: ThemeMode } = {
                editor: this.editor,
                autoSave: this.autoSave,
                recentFiles: this.recentFiles,
                maxRecentFiles: this.maxRecentFiles,
                theme: this.theme
            }
            localStorage.setItem('app-config', JSON.stringify(config))
        },

        // 清除配置
        clearConfig() {
            localStorage.removeItem('app-config')
            this.$reset()
        }
    }
})
