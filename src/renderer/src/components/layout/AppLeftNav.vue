<template>
    <aside class="app-left-nav">
        <!-- 书籍信息头 -->
        <div class="book-header">
            <div class="book-title-row">
                <InlineEdit
                    v-if="novelStore.name"
                    :value="novelStore.name"
                    class="book-title"
                    @change="(val) => (novelStore.name = val)"
                />
                <span v-else class="book-title is-empty">未命名作品</span>
            </div>
            <div class="book-stats">
                <span>{{ novelStore.volumes.length }} 卷</span>
                <i class="stat-dot"></i>
                <span>{{ totalChapters }} 章</span>
                <i class="stat-dot"></i>
                <span>{{ formatWordCount(totalWords) }} 字</span>
            </div>

            <div class="book-actions">
                <el-tooltip content="新建 (Ctrl+N)" placement="bottom" :show-after="400">
                    <button class="icon-btn" @click="openNewBookDialog">
                        <AppIcon name="file-plus" :size="15" />
                    </button>
                </el-tooltip>
                <el-tooltip content="打开 (Ctrl+O)" placement="bottom" :show-after="400">
                    <button class="icon-btn" @click="openFile">
                        <AppIcon name="folder-open" :size="15" />
                    </button>
                </el-tooltip>
                <el-tooltip content="保存 (Ctrl+S)" placement="bottom" :show-after="400">
                    <button class="icon-btn" @click="saveFile">
                        <AppIcon name="save" :size="15" />
                    </button>
                </el-tooltip>
                <span class="action-spacer"></span>
                <el-tooltip content="搜索章节" placement="bottom" :show-after="400">
                    <button
                        class="icon-btn"
                        :class="{ 'is-active': filterText }"
                        @click="focusFilter"
                    >
                        <AppIcon name="search" :size="15" />
                    </button>
                </el-tooltip>
            </div>
        </div>

        <!-- 章节过滤 -->
        <div class="filter-bar">
            <AppIcon name="search" :size="13" class="filter-icon" />
            <input
                ref="filterInputRef"
                v-model="filterText"
                class="filter-input"
                placeholder="筛选卷 / 章节..."
                @keydown.esc="filterText = ''"
            />
            <button v-if="filterText" class="icon-btn filter-clear" @click="filterText = ''">
                <AppIcon name="close" :size="12" />
            </button>
        </div>

        <!-- 目录树 -->
        <div class="chapter-list">
            <template v-if="visibleVolumes.length > 0">
                <div v-for="volume in visibleVolumes" :key="volume.index" class="volume">
                    <div
                        class="volume-row"
                        :class="{
                            'is-selected': mainStore.selectedVolumeIndex === volume.index,
                            'is-drag-over':
                                volumeDrag.dragState.value.dragOverIndex === volume.index
                        }"
                        :draggable="!filterText"
                        @click="selectVolume(volume.index)"
                        @contextmenu.prevent="showVolumeMenu($event, volume.index)"
                        @dragstart="volumeDrag.onDragStart(volume.index, $event)"
                        @dragover="volumeDrag.onDragOver(volume.index, $event)"
                        @dragleave="volumeDrag.onDragLeave()"
                        @drop="volumeDrag.onDrop(volume.index, $event)"
                        @dragend="volumeDrag.onDragEnd()"
                    >
                        <button class="icon-btn chevron" @click.stop="toggleVolume(volume.index)">
                            <AppIcon
                                name="chevron-right"
                                :size="13"
                                :class="{ 'is-expanded': isVolumeExpanded(volume.index) }"
                            />
                        </button>

                        <div class="volume-name">
                            <InlineEdit
                                :value="volume.data.volumeName"
                                @change="(val) => novelStore.updateVolumeName(volume.index, val)"
                            />
                        </div>

                        <span class="volume-count">{{ volume.data.chapters.length }}</span>

                        <div class="row-actions">
                            <el-tooltip content="添加章节" placement="top" :show-after="400">
                                <button class="icon-btn" @click.stop="addChapter(volume.index)">
                                    <AppIcon name="plus" :size="14" />
                                </button>
                            </el-tooltip>
                            <el-tooltip content="更多操作" placement="top" :show-after="400">
                                <button
                                    class="icon-btn"
                                    @click.stop="showVolumeMenu($event, volume.index)"
                                >
                                    <AppIcon name="more-horizontal" :size="14" />
                                </button>
                            </el-tooltip>
                        </div>
                    </div>

                    <!-- 章节列表 -->
                    <div v-if="isVolumeExpanded(volume.index) || filterText" class="chapters">
                        <div
                            v-for="chapter in volume.chapters"
                            :key="chapter.index"
                            class="chapter-row"
                            :class="{
                                'is-selected':
                                    mainStore.selectedVolumeIndex === volume.index &&
                                    mainStore.selectedChapterIndex === chapter.index,
                                'is-drag-over':
                                    chapterDragOverIndex === `${volume.index}-${chapter.index}`
                            }"
                            :draggable="!filterText"
                            @click="selectChapter(volume.index, chapter.index)"
                            @contextmenu.prevent="
                                showChapterMenu($event, volume.index, chapter.index)
                            "
                            @dragstart="onChapterDragStart(volume.index, chapter.index, $event)"
                            @dragover="onChapterDragOver(volume.index, chapter.index, $event)"
                            @dragleave="onChapterDragLeave()"
                            @drop="onChapterDrop(volume.index, chapter.index, $event)"
                            @dragend="onChapterDragEnd()"
                        >
                            <span class="chapter-grip"
                                ><AppIcon name="grip-vertical" :size="12"
                            /></span>

                            <div class="chapter-name">
                                <InlineEdit
                                    :value="chapter.data.chapterName"
                                    @change="
                                        (val) =>
                                            novelStore.updateChapterName(
                                                volume.index,
                                                chapter.index,
                                                val
                                            )
                                    "
                                />
                            </div>

                            <span class="chapter-words">{{ formatWordCount(chapter.words) }}</span>

                            <div class="row-actions">
                                <el-tooltip
                                    :content="chapter.data.chapterSummary || '编辑章说明'"
                                    placement="top"
                                    :show-after="400"
                                >
                                    <button
                                        class="icon-btn"
                                        :class="{ 'has-summary': !!chapter.data.chapterSummary }"
                                        @click.stop="
                                            editChapterSummary(volume.index, chapter.index)
                                        "
                                    >
                                        <AppIcon name="info" :size="13" />
                                    </button>
                                </el-tooltip>
                                <button
                                    class="icon-btn is-danger"
                                    title="删除章节"
                                    @click.stop="deleteChapter(volume.index, chapter.index)"
                                >
                                    <AppIcon name="trash" :size="13" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </template>

            <div v-else-if="filterText" class="empty-state">
                <AppIcon name="search" :size="24" class="empty-icon" />
                <p>没有匹配的章节</p>
            </div>

            <div v-else-if="mainStore.isFileLoaded" class="empty-state">
                <AppIcon name="book-open" :size="26" class="empty-icon" />
                <p>还没有卷</p>
                <p class="hint">点击下方"新增卷"开始搭建结构</p>
            </div>
        </div>

        <!-- 新增卷 -->
        <div class="sidebar-footer">
            <button class="add-volume-btn" @click="addVolume">
                <AppIcon name="plus" :size="14" />
                新增卷
            </button>
        </div>

        <!-- 新建文件对话框 -->
        <NewBookDialog :visible="showNewBookDialog" @update:visible="showNewBookDialog = $event" />

        <!-- 说明编辑对话框 -->
        <el-dialog
            v-model="showSummaryDialog"
            :title="summaryDialogTitle"
            width="460px"
            :close-on-click-modal="false"
        >
            <el-input
                v-model="summaryDialogContent"
                type="textarea"
                :rows="6"
                :placeholder="
                    summaryDialogType === 'volume' ? '这一卷主要讲什么...' : '这一章主要讲什么...'
                "
            />
            <template #footer>
                <el-button @click="showSummaryDialog = false">取消</el-button>
                <el-button type="primary" @click="saveSummary">保存</el-button>
            </template>
        </el-dialog>

        <!-- 右键菜单 -->
        <ContextMenu
            :is-visible="menuVisible"
            :x="menuX"
            :y="menuY"
            :items="menuItems"
            @close="hideMenu"
        />
    </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMainStore, useNovelStore } from '../../store'
import InlineEdit from '../common/InlineEdit.vue'
import ContextMenu from '../common/ContextMenu.vue'
import AppIcon from '../common/AppIcon.vue'
import NewBookDialog from '../dialog/NewBookDialog.vue'
import { useContextMenu, useDragSort, useFileActions } from '../../composables'
import { confirmAction, promptInput } from '../../utils/confirm'
import { countWordsInHtml, formatWordCount } from '../../utils/text'

const mainStore = useMainStore()
const novelStore = useNovelStore()
const { openFile, saveFile } = useFileActions()

// ---------- 统计 ----------
const totalChapters = computed(() =>
    novelStore.volumes.reduce((sum, vol) => sum + vol.chapters.length, 0)
)

const totalWords = computed(() =>
    novelStore.volumes.reduce(
        (sum, vol) => sum + vol.chapters.reduce((s, ch) => s + countWordsInHtml(ch.content), 0),
        0
    )
)

// ---------- 展开与过滤 ----------
const expandedVolumes = ref<Set<number>>(new Set([0]))
const filterText = ref('')
const filterInputRef = ref<HTMLInputElement | null>(null)
const showNewBookDialog = ref(false)

const isVolumeExpanded = (index: number) => expandedVolumes.value.has(index)

const toggleVolume = (index: number) => {
    if (expandedVolumes.value.has(index)) {
        expandedVolumes.value.delete(index)
    } else {
        expandedVolumes.value.add(index)
    }
}

const focusFilter = () => {
    filterInputRef.value?.focus()
}

// 过滤后的卷 / 章节视图（保留原始索引）
const lowerFilter = computed(() => filterText.value.trim().toLowerCase())

const visibleVolumes = computed(() => {
    const filter = lowerFilter.value
    return novelStore.volumes
        .map((volume, index) => {
            const volumeMatched = !filter || volume.volumeName.toLowerCase().includes(filter)
            const chapters = volume.chapters
                .map((chapter, chapterIndex) => ({
                    index: chapterIndex,
                    data: chapter,
                    words: countWordsInHtml(chapter.content)
                }))
                .filter(
                    (ch) =>
                        volumeMatched ||
                        ch.data.chapterName.toLowerCase().includes(filter) ||
                        (ch.data.chapterSummary || '').toLowerCase().includes(filter)
                )
            return { index, data: volume, chapters }
        })
        .filter(
            (volume) =>
                volume.data.volumeName.toLowerCase().includes(lowerFilter.value) ||
                volume.chapters.length > 0
        )
})

// ---------- 选择 ----------
const selectVolume = (index: number) => {
    if (!isVolumeExpanded(index)) {
        expandedVolumes.value.add(index)
        const volume = novelStore.volumes[index]
        if (volume && volume.chapters.length > 0) {
            mainStore.selectChapter(index, 0)
        }
    } else {
        toggleVolume(index)
    }
}

const selectChapter = (volumeIndex: number, chapterIndex: number) => {
    mainStore.selectChapter(volumeIndex, chapterIndex)
    if (!isVolumeExpanded(volumeIndex)) {
        expandedVolumes.value.add(volumeIndex)
    }
}

// ---------- 卷 / 章节增删 ----------
const addVolume = () => {
    const index = novelStore.insertVolumeAt(novelStore.volumes.length)
    expandedVolumes.value.add(index)
}

const addChapter = (volumeIndex: number) => {
    const index = novelStore.insertChapterAt(
        volumeIndex,
        novelStore.volumes[volumeIndex]?.chapters.length || 0
    )
    expandedVolumes.value.add(volumeIndex)
    if (index >= 0) {
        mainStore.selectChapter(volumeIndex, index)
    }
}

const deleteVolume = async (index: number) => {
    const name = novelStore.volumes[index]?.volumeName || '该卷'
    const count = novelStore.volumes[index]?.chapters.length || 0
    const ok = await confirmAction(
        `确定删除「${name}」吗？其中 ${count} 个章节将一并删除，且无法恢复。`,
        '删除卷'
    )
    if (ok) {
        novelStore.deleteVolume(index)
        expandedVolumes.value.delete(index)
    }
}

const deleteChapter = async (volumeIndex: number, chapterIndex: number) => {
    const name = novelStore.volumes[volumeIndex]?.chapters[chapterIndex]?.chapterName || '该章节'
    const ok = await confirmAction(`确定删除「${name}」吗？此操作无法恢复。`, '删除章节')
    if (ok) {
        novelStore.deleteChapter(volumeIndex, chapterIndex)
    }
}

// ---------- 说明编辑 ----------
const showSummaryDialog = ref(false)
const summaryDialogTitle = ref('')
const summaryDialogContent = ref('')
const summaryDialogType = ref<'volume' | 'chapter'>('volume')
const summaryDialogVolumeIndex = ref(0)
const summaryDialogChapterIndex = ref(0)

const editVolumeSummary = (volumeIndex: number) => {
    summaryDialogType.value = 'volume'
    summaryDialogVolumeIndex.value = volumeIndex
    summaryDialogTitle.value = `卷说明 · ${novelStore.volumes[volumeIndex].volumeName}`
    summaryDialogContent.value = novelStore.volumes[volumeIndex].volumeSummary || ''
    showSummaryDialog.value = true
}

const editChapterSummary = (volumeIndex: number, chapterIndex: number) => {
    summaryDialogType.value = 'chapter'
    summaryDialogVolumeIndex.value = volumeIndex
    summaryDialogChapterIndex.value = chapterIndex
    summaryDialogTitle.value = `章说明 · ${novelStore.volumes[volumeIndex].chapters[chapterIndex].chapterName}`
    summaryDialogContent.value =
        novelStore.volumes[volumeIndex].chapters[chapterIndex].chapterSummary || ''
    showSummaryDialog.value = true
}

const saveSummary = () => {
    if (summaryDialogType.value === 'volume') {
        novelStore.updateVolumeSummary(summaryDialogVolumeIndex.value, summaryDialogContent.value)
    } else {
        novelStore.updateChapterSummary(
            summaryDialogVolumeIndex.value,
            summaryDialogChapterIndex.value,
            summaryDialogContent.value
        )
    }
    showSummaryDialog.value = false
}

// ---------- 右键菜单 ----------
const {
    isVisible: menuVisible,
    x: menuX,
    y: menuY,
    items: menuItems,
    show: showMenu,
    hide: hideMenu
} = useContextMenu()

const renameVolume = async (volumeIndex: number) => {
    const current = novelStore.volumes[volumeIndex]?.volumeName || ''
    const value = await promptInput('请输入新的卷名', '重命名卷', current, {
        inputPattern: /\S+/,
        inputErrorMessage: '卷名不能为空'
    })
    if (value !== null) {
        novelStore.updateVolumeName(volumeIndex, value.trim())
    }
}

const renameChapter = async (volumeIndex: number, chapterIndex: number) => {
    const current = novelStore.volumes[volumeIndex]?.chapters[chapterIndex]?.chapterName || ''
    const value = await promptInput('请输入新的章节名', '重命名章节', current, {
        inputPattern: /\S+/,
        inputErrorMessage: '章节名不能为空'
    })
    if (value !== null) {
        novelStore.updateChapterName(volumeIndex, chapterIndex, value.trim())
    }
}

const showVolumeMenu = (event: MouseEvent, volumeIndex: number) => {
    showMenu(event, [
        { label: '重命名', icon: 'pencil', action: () => renameVolume(volumeIndex) },
        { label: '编辑卷说明', icon: 'info', action: () => editVolumeSummary(volumeIndex) },
        { divider: true },
        {
            label: '在上方插入卷',
            icon: 'arrow-up',
            action: () => novelStore.insertVolumeAt(volumeIndex)
        },
        {
            label: '在下方插入卷',
            icon: 'arrow-down',
            action: () => {
                const index = novelStore.insertVolumeAt(volumeIndex + 1)
                expandedVolumes.value.add(index)
            }
        },
        { divider: true },
        { label: '删除卷', icon: 'trash', danger: true, action: () => deleteVolume(volumeIndex) }
    ])
}

const showChapterMenu = (event: MouseEvent, volumeIndex: number, chapterIndex: number) => {
    showMenu(event, [
        { label: '重命名', icon: 'pencil', action: () => renameChapter(volumeIndex, chapterIndex) },
        {
            label: '编辑章说明',
            icon: 'info',
            action: () => editChapterSummary(volumeIndex, chapterIndex)
        },
        { divider: true },
        {
            label: '在上方插入章节',
            icon: 'arrow-up',
            action: () => {
                const index = novelStore.insertChapterAt(volumeIndex, chapterIndex)
                expandedVolumes.value.add(volumeIndex)
                if (index >= 0) mainStore.selectChapter(volumeIndex, index)
            }
        },
        {
            label: '在下方插入章节',
            icon: 'arrow-down',
            action: () => {
                const index = novelStore.insertChapterAt(volumeIndex, chapterIndex + 1)
                expandedVolumes.value.add(volumeIndex)
                if (index >= 0) mainStore.selectChapter(volumeIndex, index)
            }
        },
        { divider: true },
        {
            label: '删除章节',
            icon: 'trash',
            danger: true,
            action: () => deleteChapter(volumeIndex, chapterIndex)
        }
    ])
}

// ---------- 拖拽排序 ----------
const volumeDrag = useDragSort((from, to) => {
    novelStore.moveVolume(from, to)
})

const chapterDragIndex = ref<number | null>(null)
const chapterDragOverIndex = ref<string | null>(null)

const onChapterDragStart = (_volumeIndex: number, chapterIndex: number, event: DragEvent) => {
    chapterDragIndex.value = chapterIndex
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setDragImage(event.target as HTMLElement, 0, 0)
    }
}

const onChapterDragOver = (volumeIndex: number, chapterIndex: number, event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    chapterDragOverIndex.value = `${volumeIndex}-${chapterIndex}`
}

const onChapterDragLeave = () => {
    chapterDragOverIndex.value = null
}

const onChapterDrop = (volumeIndex: number, chapterIndex: number, event: DragEvent) => {
    event.preventDefault()
    const from = chapterDragIndex.value
    if (from !== null && from !== chapterIndex) {
        novelStore.moveChapter(volumeIndex, from, chapterIndex)
    }
    chapterDragIndex.value = null
    chapterDragOverIndex.value = null
}

const onChapterDragEnd = () => {
    chapterDragIndex.value = null
    chapterDragOverIndex.value = null
}

// ---------- 新建文件事件 ----------
const openNewBookDialog = () => {
    showNewBookDialog.value = true
}

const handleNewFileEvent = () => {
    openNewBookDialog()
}

onMounted(() => {
    window.addEventListener('app-new-file', handleNewFileEvent)
})

onUnmounted(() => {
    window.removeEventListener('app-new-file', handleNewFileEvent)
})
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.app-left-nav {
    width: @sidebar-left-width;
    display: flex;
    flex-direction: column;
    background: var(--bg-subtle);
    border-right: 1px solid var(--border);
    flex-shrink: 0;
}

// ---------- 书籍信息头 ----------
.book-header {
    padding: @spacing-lg @spacing-md @spacing-sm;
    border-bottom: 1px solid var(--border);

    .book-title-row {
        min-height: 26px;
    }

    .book-title {
        font-size: @font-size-lg;
        font-weight: @font-weight-bold;
        color: var(--text-1);

        &.is-empty {
            color: var(--text-3);
        }
    }

    .book-stats {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
        font-size: @font-size-sm;
        color: var(--text-3);

        .stat-dot {
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: var(--text-3);
            opacity: 0.5;
        }
    }

    .book-actions {
        display: flex;
        align-items: center;
        gap: 2px;
        margin-top: @spacing-md;
        padding: 4px;
        border: 1px solid var(--border);
        border-radius: @radius-lg;
        background: var(--bg-surface);

        .action-spacer {
            flex: 1;
        }

        .icon-btn {
            width: 32px;
            height: 28px;
        }
    }
}

// ---------- 过滤 ----------
.filter-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: @spacing-sm @spacing-md;
    padding: 0 8px;
    height: 30px;
    border: 1px solid transparent;
    border-radius: @radius-md;
    background: var(--bg-inset);
    transition:
        border-color @transition-fast,
        background @transition-fast;

    &:focus-within {
        border-color: var(--accent);
        background: var(--bg-surface);
    }

    .filter-icon {
        color: var(--text-3);
        flex-shrink: 0;
    }

    .filter-input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        font-size: @font-size-base;
        color: var(--text-1);

        &::placeholder {
            color: var(--text-3);
        }
    }

    .filter-clear {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
    }
}

// ---------- 目录树 ----------
.chapter-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 @spacing-sm @spacing-sm;
}

.volume {
    & + .volume {
        margin-top: 2px;
    }
}

.volume-row {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    border-radius: @radius-md;
    cursor: pointer;
    transition: background @transition-fast;

    &:hover {
        background: var(--hover);

        .row-actions {
            opacity: 1;
        }

        .volume-count {
            display: none;
        }
    }

    &.is-selected {
        background: var(--selected-soft);
    }

    &.is-drag-over {
        box-shadow: inset 0 2px 0 var(--accent);
    }

    .chevron {
        width: 22px;
        height: 22px;
        flex-shrink: 0;

        :deep(.app-icon) {
            transition: transform @transition-fast;
            color: var(--text-3);

            &.is-expanded {
                transform: rotate(90deg);
            }
        }
    }

    .volume-name {
        flex: 1;
        min-width: 0;
        font-size: @font-size-base;
        font-weight: @font-weight-semibold;
        color: var(--text-1);
    }

    .volume-count {
        font-size: @font-size-xs;
        color: var(--text-3);
        background: var(--bg-inset);
        border-radius: @radius-full;
        padding: 1px 7px;
        flex-shrink: 0;
    }

    .row-actions {
        display: flex;
        gap: 1px;
        opacity: 0;
        transition: opacity @transition-fast;

        .icon-btn {
            width: 24px;
            height: 24px;
        }
    }
}

.chapters {
    padding: 1px 0 4px 14px;
}

.chapter-row {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px 4px 4px;
    border-radius: @radius-md;
    cursor: pointer;
    color: var(--text-2);
    transition:
        background @transition-fast,
        color @transition-fast;

    &:hover {
        background: var(--hover);
        color: var(--text-1);

        .row-actions {
            opacity: 1;
        }

        .chapter-words {
            display: none;
        }
    }

    &.is-selected {
        background: var(--accent-soft);
        color: var(--accent);

        .chapter-words {
            color: var(--accent);
            opacity: 0.75;
        }
    }

    &.is-drag-over {
        box-shadow: inset 0 2px 0 var(--accent);
    }

    .chapter-grip {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 22px;
        color: var(--text-3);
        opacity: 0;
        flex-shrink: 0;
        transition: opacity @transition-fast;
        cursor: grab;
    }

    &:hover .chapter-grip {
        opacity: 0.7;
    }

    .chapter-name {
        flex: 1;
        min-width: 0;
        font-size: @font-size-base;
    }

    .chapter-words {
        font-size: @font-size-xs;
        color: var(--text-3);
        flex-shrink: 0;
    }

    .row-actions {
        display: flex;
        gap: 1px;
        opacity: 0;
        transition: opacity @transition-fast;

        .icon-btn {
            width: 24px;
            height: 24px;
        }

        .has-summary {
            color: var(--warning);
        }
    }
}

// ---------- 底部 ----------
.sidebar-footer {
    padding: @spacing-sm @spacing-md;
    border-top: 1px solid var(--border);

    .add-volume-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: 100%;
        padding: 8px;
        border: 1px dashed var(--border-strong);
        background: transparent;
        border-radius: @radius-md;
        cursor: pointer;
        color: var(--text-2);
        font-size: @font-size-base;
        transition: all @transition-fast;

        &:hover {
            border-color: var(--accent);
            color: var(--accent);
            background: var(--accent-soft);
        }
    }
}
</style>
