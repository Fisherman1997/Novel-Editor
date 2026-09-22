<template>
    <el-dialog
        v-model="visible"
        title="搜索和替换"
        width="520px"
        :close-on-click-modal="false"
        @close="handleClose"
    >
        <div class="search-dialog">
            <div class="search-input-row">
                <el-input
                    v-model="query"
                    placeholder="搜索内容..."
                    clearable
                    @input="handleSearch"
                    @keydown.enter="nextResult"
                >
                    <template #prefix>
                        <AppIcon name="search" :size="14" />
                    </template>
                </el-input>
                <div class="result-nav">
                    <span v-if="resultCount > 0" class="result-count">
                        {{ currentIndex + 1 }} / {{ resultCount }}
                    </span>
                    <span v-else-if="query" class="result-count muted">无结果</span>
                    <button
                        class="icon-btn"
                        :disabled="resultCount === 0"
                        title="上一个 (Enter 上一个)"
                        @click="prevResult"
                    >
                        <AppIcon name="arrow-up" :size="14" />
                    </button>
                    <button
                        class="icon-btn"
                        :disabled="resultCount === 0"
                        title="下一个 (Enter)"
                        @click="nextResult"
                    >
                        <AppIcon name="arrow-down" :size="14" />
                    </button>
                </div>
            </div>

            <div v-if="showReplace" class="replace-input-row">
                <el-input v-model="replaceText" placeholder="替换为..." clearable>
                    <template #prefix>
                        <AppIcon name="pencil" :size="14" />
                    </template>
                </el-input>
                <el-button :disabled="resultCount === 0" @click="replaceCurrent">替换</el-button>
                <el-button
                    :disabled="resultCount === 0"
                    type="warning"
                    plain
                    @click="replaceCurrentAll"
                >
                    全部替换
                </el-button>
            </div>

            <div class="search-options">
                <el-check-tag
                    :checked="options.caseSensitive"
                    @change="toggleOption('caseSensitive')"
                    >区分大小写</el-check-tag
                >
                <el-check-tag :checked="options.wholeWord" @change="toggleOption('wholeWord')"
                    >全词匹配</el-check-tag
                >
                <el-check-tag :checked="options.useRegex" @change="toggleOption('useRegex')"
                    >正则表达式</el-check-tag
                >
                <span class="option-spacer"></span>
                <el-radio-group v-model="options.scope" size="small">
                    <el-radio-button label="current">当前章节</el-radio-button>
                    <el-radio-button label="all">全书</el-radio-button>
                </el-radio-group>
            </div>

            <div class="search-results">
                <div v-if="results.length > 0" class="results-list">
                    <div
                        v-for="(result, index) in results"
                        :key="index"
                        class="result-item"
                        :class="{ 'is-active': index === currentIndex }"
                        @click="goToResult(index)"
                    >
                        <div class="result-chapter">{{ result.chapterName }}</div>
                        <div class="result-text" v-html="highlightText(result.matchText)"></div>
                    </div>
                </div>

                <div v-else-if="query && !isSearching" class="no-results">
                    <AppIcon name="search" :size="24" class="empty-icon" />
                    <p>未找到匹配结果</p>
                </div>

                <div v-else class="no-results">
                    <p class="muted">输入内容开始搜索，Enter 跳转下一处</p>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <el-button plain @click="showReplace = !showReplace">
                    {{ showReplace ? '隐藏替换' : '展开替换' }}
                </el-button>
                <el-button type="primary" plain @click="handleClose"> 关闭 </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useEditorStore, useMainStore, useNovelStore } from '../../store'
import { useSearch } from '../../composables'
import { getPlainText, replaceMatchesInHtml } from '../../utils/htmlText'
import { showSuccess } from '../../utils/errorHandler'
import AppIcon from '../common/AppIcon.vue'

const editorStore = useEditorStore()
const mainStore = useMainStore()
const novelStore = useNovelStore()
const {
    query,
    replaceText,
    options,
    results,
    currentIndex,
    isSearching,
    resultCount,
    search,
    next,
    prev,
    goToResult: goToSearchResult,
    highlightText
} = useSearch()

const visible = ref(false)
const showReplace = ref(false)

watch(
    () => editorStore.search.isOpen,
    (isOpen) => {
        visible.value = isOpen
        if (isOpen) {
            setTimeout(() => {
                const input = document.querySelector('.search-input-row input') as HTMLInputElement
                input?.focus()
            }, 100)
        }
    }
)

const handleSearch = () => {
    search()
}

// 选项切换（el-check-tag 的 change 回调携带新值）
const toggleOption = (key: 'caseSensitive' | 'wholeWord' | 'useRegex') => {
    options[key] = !options[key]
    search()
}

// 跳转搜索结果：切换章节 + 请求滚动定位
const scrollToResult = (result: {
    volumeIndex: number
    chapterIndex: number
    position: number
    length: number
}) => {
    mainStore.selectChapter(result.volumeIndex, result.chapterIndex)
    editorStore.setPendingScroll(result.position, result.length)
}

const nextResult = () => {
    const r = next()
    if (r) scrollToResult(r)
}

const prevResult = () => {
    const r = prev()
    if (r) scrollToResult(r)
}

const goToResult = (index: number) => {
    const r = goToSearchResult(index)
    if (r) scrollToResult(r)
}

// 替换单个：用 DOM 安全的方式替换纯文本偏移对应的 HTML 片段
const replaceCurrent = () => {
    const r = editorStore.currentResult
    if (!r) return

    const chapter = novelStore.volumes[r.volumeIndex]?.chapters[r.chapterIndex]
    if (!chapter) return

    const plain = getPlainText(chapter.content)
    const originalText = plain.slice(r.position, r.position + r.length)
    // 用精确偏移重建搜索结果用于替换（保证 position/length 一致）
    const matches = [{ start: r.position, end: r.position + r.length, text: originalText }]
    const newContent = replaceMatchesInHtml(chapter.content, matches, replaceText.value)
    novelStore.updateChapterContent(r.volumeIndex, r.chapterIndex, newContent)
    search()
}

// 替换全部
const replaceCurrentAll = () => {
    const allResults = [...results.value]
    if (allResults.length === 0) return

    const chapterGroups = new Map<string, typeof allResults>()
    allResults.forEach((r) => {
        const key = `${r.volumeIndex}-${r.chapterIndex}`
        if (!chapterGroups.has(key)) chapterGroups.set(key, [])
        chapterGroups.get(key)!.push(r)
    })

    let count = 0
    chapterGroups.forEach((chResults, key) => {
        const [volIdx, chIdx] = key.split('-').map(Number)
        const chapter = novelStore.volumes[volIdx]?.chapters[chIdx]
        if (!chapter) return

        const plain = getPlainText(chapter.content)
        const domMatches = chResults
            .sort((a, b) => b.position - a.position)
            .map((r) => ({
                start: r.position,
                end: r.position + r.length,
                text: plain.slice(r.position, r.position + r.length)
            }))

        chapter.content = replaceMatchesInHtml(chapter.content, domMatches, replaceText.value)
        count += domMatches.length
        novelStore.updateChapterContent(volIdx, chIdx, chapter.content)
    })

    showSuccess(`已替换 ${count} 处`)
    search()
}

const handleClose = () => {
    visible.value = false
    editorStore.closeSearch()
}
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.search-dialog {
    display: flex;
    flex-direction: column;
    gap: @spacing-md;
}

.search-input-row,
.replace-input-row {
    display: flex;
    align-items: center;
    gap: @spacing-sm;

    :deep(.el-input) {
        flex: 1;
    }
}

.result-nav {
    display: flex;
    align-items: center;
    gap: 2px;

    .result-count {
        font-size: @font-size-sm;
        color: var(--text-2);
        font-family: @font-mono;
        padding: 0 6px;
        white-space: nowrap;

        &.muted {
            color: var(--text-3);
        }
    }

    .icon-btn {
        width: 26px;
        height: 26px;
    }
}

.search-options {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: @spacing-sm;

    .option-spacer {
        flex: 1;
    }

    :deep(.el-check-tag) {
        background: var(--bg-inset);
        color: var(--text-2);
        border-radius: @radius-md;
        font-weight: @font-weight-normal;
    }

    :deep(.el-check-tag.is-checked) {
        background: var(--accent-soft);
        color: var(--accent);
    }
}

.search-results {
    display: flex;
    flex-direction: column;

    .results-list {
        max-height: 280px;
        overflow-y: auto;
        border: 1px solid var(--border);
        border-radius: @radius-lg;
        background: var(--bg-surface);

        .result-item {
            padding: @spacing-sm @spacing-md;
            cursor: pointer;
            border-bottom: 1px solid var(--border);
            transition: background @transition-fast;

            &:hover {
                background: var(--hover);
            }

            &.is-active {
                background: var(--selected-soft);
                box-shadow: inset 3px 0 0 var(--accent);
            }

            &:last-child {
                border-bottom: none;
            }

            .result-chapter {
                font-size: @font-size-sm;
                color: var(--text-3);
                margin-bottom: 2px;
            }

            .result-text {
                font-size: @font-size-base;
                color: var(--text-1);

                :deep(mark) {
                    background: var(--accent-soft);
                    color: var(--accent);
                    font-weight: @font-weight-semibold;
                    padding: 0 2px;
                    border-radius: @radius-sm;
                }
            }
        }
    }

    .no-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: @spacing-sm;
        text-align: center;
        color: var(--text-3);
        padding: @spacing-2xl;

        p {
            margin: 0;
            font-size: @font-size-base;

            &.muted {
                font-size: @font-size-sm;
            }
        }
    }
}

.dialog-footer {
    display: flex;
    justify-content: space-between;
}
</style>
