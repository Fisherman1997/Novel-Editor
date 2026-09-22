import { defineStore } from 'pinia'
import { SearchResult, SearchOptions } from '@shared/types'

// 标注选区（ProseMirror 位置）
export interface AnnotationSelection {
    from: number
    to: number
    text: string
}

// 标注编辑目标
export interface AnnotationEditTarget {
    volumeIndex: number
    chapterIndex: number
    annotationId: string
}

// 滚动定位请求（nonce 变化触发编辑器执行）
export interface PendingScroll {
    position: number // 章节纯文本偏移
    length: number
    nonce: number
}

interface EditorState {
    // 编辑器实例（由组件设置）
    isReady: boolean

    // 光标位置
    cursorPosition: number
    selection: { from: number; to: number } | null

    // 撤销/重做状态
    canUndo: boolean
    canRedo: boolean

    // 搜索状态（useSearch 与 SearchDialog 共享此单一状态源）
    search: {
        query: string
        replaceText: string
        options: SearchOptions
        results: SearchResult[]
        currentIndex: number
        isOpen: boolean
        isSearching: boolean
    }

    // 标注对话框状态
    annotationDialog: {
        isOpen: boolean
        mode: 'create' | 'edit'
        createSelection: AnnotationSelection | null
        editTarget: AnnotationEditTarget | null
    }

    // 搜索结果跳转定位
    pendingScroll: PendingScroll | null

    // 外部修改章节内容后请求编辑器重新加载（nonce 递增触发）
    contentReloadNonce: number
}

export const useEditorStore = defineStore('editor', {
    state: (): EditorState => ({
        isReady: false,

        cursorPosition: 0,
        selection: null,

        canUndo: false,
        canRedo: false,

        search: {
            query: '',
            replaceText: '',
            options: {
                caseSensitive: false,
                wholeWord: false,
                useRegex: false,
                scope: 'all'
            },
            results: [],
            currentIndex: 0,
            isOpen: false,
            isSearching: false
        },

        annotationDialog: {
            isOpen: false,
            mode: 'create',
            createSelection: null,
            editTarget: null
        },

        pendingScroll: null,

        contentReloadNonce: 0
    }),

    getters: {
        // 当前搜索结果
        currentResult: (state): SearchResult | null => {
            if (state.search.results.length === 0) return null
            return state.search.results[state.search.currentIndex] || null
        },

        // 搜索结果数量
        resultCount: (state): number => {
            return state.search.results.length
        }
    },

    actions: {
        // 设置编辑器就绪
        setReady(ready: boolean) {
            this.isReady = ready
        },

        // 更新光标位置
        updateCursor(position: number, selection?: { from: number; to: number }) {
            this.cursorPosition = position
            this.selection = selection || null
        },

        // 更新撤销/重做状态
        updateUndoRedoState(canUndo: boolean, canRedo: boolean) {
            this.canUndo = canUndo
            this.canRedo = canRedo
        },

        // 打开搜索
        openSearch() {
            this.search.isOpen = true
        },

        // 关闭搜索
        closeSearch() {
            this.search.isOpen = false
            this.search.query = ''
            this.search.replaceText = ''
            this.search.results = []
            this.search.currentIndex = 0
            this.pendingScroll = null
        },

        // 搜索结果跳转定位
        setPendingScroll(position: number, length: number) {
            this.pendingScroll = { position, length, nonce: Date.now() + Math.random() }
        },

        // 设置搜索结果（由 useSearch 调用）
        setSearchResults(results: SearchResult[]) {
            this.search.results = results
            this.search.currentIndex = 0
        },

        // 请求编辑器重新加载当前章节内容
        requestContentReload() {
            this.contentReloadNonce++
        },

        // ---------- 标注对话框 ----------

        // 创建标注：携带编辑器选区
        openAnnotationCreate(selection: AnnotationSelection) {
            this.annotationDialog = {
                isOpen: true,
                mode: 'create',
                createSelection: selection,
                editTarget: null
            }
        },

        // 编辑标注：携带标注位置信息
        openAnnotationEdit(target: AnnotationEditTarget) {
            this.annotationDialog = {
                isOpen: true,
                mode: 'edit',
                createSelection: null,
                editTarget: target
            }
        },

        closeAnnotationDialog() {
            this.annotationDialog.isOpen = false
            this.annotationDialog.createSelection = null
            this.annotationDialog.editTarget = null
        },

        // 重置编辑器状态
        reset() {
            this.isReady = false
            this.cursorPosition = 0
            this.selection = null
            this.canUndo = false
            this.canRedo = false
            this.search = {
                query: '',
                replaceText: '',
                options: {
                    caseSensitive: false,
                    wholeWord: false,
                    useRegex: false,
                    scope: 'all'
                },
                results: [],
                currentIndex: 0,
                isOpen: false,
                isSearching: false
            }
            this.annotationDialog = {
                isOpen: false,
                mode: 'create',
                createSelection: null,
                editTarget: null
            }
            this.pendingScroll = null
        }
    }
})
