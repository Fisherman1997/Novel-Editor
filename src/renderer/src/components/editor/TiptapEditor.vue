<template>
    <div class="tiptap-editor">
        <EditorToolbar
            v-if="editor"
            :editor="editor"
            :show-annotation-tools="true"
            @toggle-annotation-mode="toggleAnnotationMode"
        />

        <!-- 章节面包屑 -->
        <div class="chapter-bar">
            <span v-if="volumeName" class="crumb volume">{{ volumeName }}</span>
            <AppIcon v-if="volumeName" name="chevron-right" :size="12" class="crumb-sep" />
            <span class="crumb chapter">{{ chapterName }}</span>
        </div>

        <div ref="editorContentRef" class="editor-scroll" @click="focusEditor">
            <div class="editor-page" :style="pageStyle">
                <editor-content :editor="editor" class="editor-container" />
            </div>
        </div>

        <div class="editor-statusbar">
            <div class="statusbar-left">
                <span class="word-count" title="当前章节字数">
                    <AppIcon name="file-text" :size="13" />
                    本章 {{ formatWordCount(chapterWords) }} 字
                </span>
                <span class="divider"></span>
                <span class="word-count" title="全书总字数">
                    <AppIcon name="book-open" :size="13" />
                    全书 {{ formatWordCount(bookWords) }} 字
                </span>
            </div>

            <div class="statusbar-right">
                <span class="save-state" :class="{ 'is-dirty': mainStore.isDirty }">
                    <span class="save-dot"></span>
                    {{ saveStateText }}
                </span>

                <span class="divider"></span>

                <el-tooltip content="章节目录 (Ctrl+\)" placement="top" :show-after="400">
                    <button
                        class="icon-btn"
                        :class="{ 'is-active': !isLeftCollapsed }"
                        @click="toggleLeftPanel"
                    >
                        <AppIcon name="panel-left" :size="14" />
                    </button>
                </el-tooltip>
                <el-tooltip content="素材面板 (Ctrl+Shift+H)" placement="top" :show-after="400">
                    <button
                        class="icon-btn"
                        :class="{ 'is-active': !isRightCollapsed }"
                        @click="toggleRightPanel"
                    >
                        <AppIcon name="panel-right" :size="14" />
                    </button>
                </el-tooltip>
                <el-tooltip
                    :content="isFullscreen ? '退出沉浸模式 (Esc)' : '沉浸模式 (Ctrl+Shift+E)'"
                    placement="top"
                    :show-after="400"
                >
                    <button
                        class="icon-btn"
                        :class="{ 'is-active': isFullscreen }"
                        @click="toggleFullscreen"
                    >
                        <AppIcon name="maximize" :size="14" />
                    </button>
                </el-tooltip>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import EditorToolbar from './EditorToolbar.vue'
import AppIcon from '../common/AppIcon.vue'
import { useMainStore, useNovelStore, useEditorStore } from '../../store'
import { useAnnotation, usePanelCollapse } from '../../composables'
import { AnnotationMark } from '../../editor/AnnotationMark'
import { countWords, countWordsInHtml, formatWordCount } from '../../utils/text'
import { resolveFontFamily } from '../../utils/fonts'
import { textOffsetToPos } from '../../editor/textPosition'

interface Props {
    showAnnotationTools?: boolean
}

withDefaults(defineProps<Props>(), {
    showAnnotationTools: false
})

const mainStore = useMainStore()
const novelStore = useNovelStore()
const editorStore = useEditorStore()
const { openCreate } = useAnnotation()
const {
    isLeftCollapsed,
    isRightCollapsed,
    isFullscreen,
    toggleLeftPanel,
    toggleRightPanel,
    toggleFullscreen
} = usePanelCollapse()

const isFocused = ref(false)
const editorContentRef = ref<HTMLDivElement | null>(null)

// ---------- 字数统计 ----------
const chapterWords = computed(() => {
    if (editor.value) {
        return countWords(editor.value.getText())
    }
    return countWordsInHtml(novelStore.currentChapter?.content || '')
})

const bookWords = computed(() =>
    novelStore.volumes.reduce(
        (sum, vol) => sum + vol.chapters.reduce((s, ch) => s + countWordsInHtml(ch.content), 0),
        0
    )
)

// ---------- 章节面包屑 ----------
const volumeName = computed(() => {
    const volume = novelStore.volumes[mainStore.selectedVolumeIndex]
    return volume ? volume.volumeName : ''
})

const chapterName = computed(() => {
    const chapter = novelStore.currentChapter
    return chapter ? chapter.chapterName : '未选择章节'
})

// ---------- 应用编辑器外观配置 ----------
const pageStyle = computed(() => {
    const config = mainStore.editor
    return {
        fontSize: `${config.fontSize}px`,
        lineHeight: `${config.lineHeight}px`,
        fontFamily: resolveFontFamily(config.fontFamily),
        color: config.fontColor,
        backgroundColor: config.backgroundColor
    }
})

// ---------- 保存状态 ----------
const saveStateText = computed(() => {
    if (mainStore.isDirty) return '有未保存更改'
    if (mainStore.lastSavedAt) {
        return `已保存 ${new Date(mainStore.lastSavedAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        })}`
    }
    return '尚未保存'
})

// ---------- 创建编辑器 ----------
const editor = useEditor({
    content: '',
    extensions: [
        StarterKit.configure({
            heading: { levels: [1, 2, 3] }
        }),
        Placeholder.configure({ placeholder: '开始写作...' }),
        Highlight.configure({ multicolor: true }),
        Link.configure({ openOnClick: false, autolink: true }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Underline,
        AnnotationMark
    ],
    editorProps: {
        attributes: {
            class: 'novel-editor-content'
        }
    },
    onUpdate: ({ editor: e }) => {
        const { selectedVolumeIndex, selectedChapterIndex } = mainStore
        novelStore.updateChapterContent(selectedVolumeIndex, selectedChapterIndex, e.getHTML())
        editorStore.updateCursor(e.state.selection.from, {
            from: e.state.selection.from,
            to: e.state.selection.to
        })
        editorStore.updateUndoRedoState(e.can().undo(), e.can().redo())
    },
    onFocus: () => {
        isFocused.value = true
        editorStore.setReady(true)
    },
    onBlur: () => {
        isFocused.value = false
    },
    onSelectionUpdate: ({ editor: e }) => {
        editorStore.updateCursor(
            e.state.selection.from,
            e.state.selection.from !== e.state.selection.to
                ? { from: e.state.selection.from, to: e.state.selection.to }
                : undefined
        )
        editorStore.updateUndoRedoState(e.can().undo(), e.can().redo())
    }
})

// 监听章节切换
watch(
    () => [mainStore.selectedVolumeIndex, mainStore.selectedChapterIndex],
    ([volumeIndex, chapterIndex]) => {
        if (!editor.value) return
        const chapter = novelStore.volumes[volumeIndex as number]?.chapters[chapterIndex as number]
        if (chapter) {
            editor.value.commands.setContent(chapter.content || '', false)
            editorStore.updateUndoRedoState(false, false)
        }
    }
)

// 监听外部内容重载请求（替换标注后需要重新加载）
watch(
    () => editorStore.contentReloadNonce,
    () => {
        if (!editor.value) return
        const chapter = novelStore.currentChapter
        if (chapter) {
            editor.value.commands.setContent(chapter.content || '', false)
        }
    }
)

// 创建标注确认后：在捕获的选区上打 annotation mark（触发 onUpdate 写回 HTML）
watch(
    () => editorStore.pendingAnnotationMark?.nonce,
    async () => {
        const mark = editorStore.pendingAnnotationMark
        if (!mark || !editor.value) return
        await nextTick()
        const { from, to } = mark
        const docSize = editor.value.state.doc.content.size
        if (from < 0 || to > docSize || from >= to) {
            editorStore.clearPendingAnnotationMark()
            return
        }
        const ok = editor.value
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .setAnnotation({ annotationId: mark.annotationId, color: mark.color })
            .run()
        editorStore.clearPendingAnnotationMark()
        if (!ok) {
            console.warn('标注 mark 应用失败', mark.annotationId)
        }
    }
)

// 监听搜索滚动定位
watch(
    () => editorStore.pendingScroll,
    async (scroll) => {
        if (!scroll || !editor.value) return
        await nextTick()
        const pos = textOffsetToPos(editor.value.state.doc, scroll.position)
        if (pos === null) return
        editor.value.chain().focus().setTextSelection(pos).run()
        // 滚动到可视区
        const { view } = editor.value
        const coords = view.coordsAtPos(pos)
        const container = editorContentRef.value
        if (container && coords) {
            const containerRect = container.getBoundingClientRect()
            const targetY =
                coords.top - containerRect.top + container.scrollTop - containerRect.height / 3
            container.scrollTo({ top: targetY, behavior: 'smooth' })
        }
    }
)

// 监听小说数据加载
watch(
    () => novelStore.name,
    () => {
        if (!editor.value) return
        const chapter = novelStore.currentChapter
        if (chapter) {
            editor.value.commands.setContent(chapter.content || '', false)
        }
    }
)

// ---------- 快捷键 ----------
const handleKeyDown = (event: KeyboardEvent) => {
    if (!editor.value) return

    // Ctrl+F: 搜索
    if (event.ctrlKey && event.key === 'f') {
        event.preventDefault()
        editorStore.openSearch()
    }
}

const focusEditor = () => {
    editor.value?.commands.focus()
}

// 标注模式
const toggleAnnotationMode = () => {
    const sel = editor.value?.state.selection
    if (!sel || sel.empty || !editor.value) return

    const { from, to } = sel
    const text = editor.value.state.doc.textBetween(from, to)
    if (!text) return

    openCreate({ from, to, text })
}

defineExpose({
    focus: focusEditor,
    getContent: () => editor.value?.getHTML() || '',
    setContent: (content: string) => editor.value?.commands.setContent(content, false),
    undo: () => editor.value?.chain().focus().undo().run(),
    redo: () => editor.value?.chain().focus().redo().run()
})

onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
    const chapter = novelStore.currentChapter
    if (chapter && editor.value) {
        editor.value.commands.setContent(chapter.content || '', false)
    }
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeyDown)
    editor.value?.destroy()
})
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.tiptap-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-base);
}

// ---------- 章节面包屑 ----------
.chapter-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px @spacing-xl 0;
    font-size: @font-size-sm;
    flex-shrink: 0;
    max-width: @editor-max-width;
    margin: 0 auto;
    width: 100%;

    .crumb {
        &.volume {
            color: var(--text-3);
        }

        &.chapter {
            color: var(--text-2);
            font-weight: @font-weight-medium;
        }
    }

    .crumb-sep {
        color: var(--text-3);
        opacity: 0.6;
    }
}

// ---------- 编辑区 ----------
.editor-scroll {
    flex: 1;
    overflow-y: auto;
    cursor: text;
    min-height: 0;
}

.editor-page {
    max-width: @editor-max-width;
    margin: @spacing-lg auto @spacing-2xl;
    min-height: calc(100% - @spacing-lg - @spacing-2xl);
    border-radius: @radius-xl;
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    transition: box-shadow @transition-normal;

    &:focus-within {
        box-shadow: var(--shadow-md);
    }
}

.editor-container {
    padding: @spacing-3xl @spacing-2xl;
    min-height: 300px;

    :deep(.tiptap) {
        outline: none;
        min-height: 260px;

        p.is-editor-empty:first-child::before {
            color: var(--text-3);
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
            font-style: italic;
        }

        h1,
        h2,
        h3 {
            font-weight: @font-weight-bold;
            font-family: inherit;
        }

        h1 {
            font-size: 1.6em;
            margin: 0.8em 0 0.5em;
        }

        h2 {
            font-size: 1.35em;
            margin: 0.7em 0 0.4em;
        }

        h3 {
            font-size: 1.15em;
            margin: 0.6em 0 0.3em;
            font-weight: @font-weight-semibold;
        }

        p {
            margin: 0.55em 0;
            text-indent: 2em;
        }

        ul,
        ol {
            padding-left: 1.5em;
            margin: 0.5em 0;

            p {
                text-indent: 0;
            }
        }

        blockquote {
            padding-left: 1em;
            border-left: 3px solid var(--border-strong);
            margin: 1em 0;
            color: var(--text-2);
            font-style: italic;

            p {
                text-indent: 0;
            }
        }

        pre {
            background: var(--bg-inset);
            padding: 1em;
            border-radius: @radius-md;
            border: 1px solid var(--border);
            overflow-x: auto;
            font-family: @font-mono;
            font-size: 0.85em;

            code {
                background: none;
                padding: 0;
            }
        }

        code {
            background: var(--bg-inset);
            padding: 0.2em 0.4em;
            border-radius: @radius-sm;
            font-size: 0.9em;
            font-family: @font-mono;
        }

        a {
            color: var(--accent);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color @transition-normal;

            &:hover {
                border-bottom-color: var(--accent);
            }
        }

        mark {
            padding: 0.1em 0.2em;
            border-radius: @radius-sm;
        }

        mark[data-annotation-id] {
            cursor: pointer;
            transition: opacity @transition-normal;

            &:hover {
                opacity: 0.8;
            }
        }

        ul[data-type='taskList'] {
            list-style: none;
            padding-left: 0;

            li {
                display: flex;
                align-items: flex-start;
                margin: 0.5em 0;

                label {
                    margin-right: 0.5em;
                    margin-top: 0.3em;
                }

                div[data-type='taskItemInput'] {
                    margin-right: 0.5em;
                }

                p {
                    text-indent: 0;
                }
            }
        }
    }
}

// ---------- 状态栏 ----------
.editor-statusbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: @statusbar-height;
    padding: 0 @spacing-md 0 @spacing-lg;
    border-top: 1px solid var(--border);
    background: var(--bg-subtle);
    font-size: @font-size-sm;
    color: var(--text-3);
    flex-shrink: 0;
    user-select: none;

    .statusbar-left,
    .statusbar-right {
        display: flex;
        align-items: center;
        gap: @spacing-md;
    }

    .word-count {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-weight: @font-weight-medium;
        color: var(--text-2);
    }

    .divider {
        width: 1px;
        height: 14px;
        background: var(--border-strong);
    }

    .save-state {
        display: inline-flex;
        align-items: center;
        gap: 6px;

        .save-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--success);
        }

        &.is-dirty .save-dot {
            background: var(--warning);
        }
    }

    .statusbar-right .icon-btn {
        width: 26px;
        height: 24px;
        color: var(--text-3);

        &:hover {
            color: var(--text-1);
        }
    }
}
</style>
