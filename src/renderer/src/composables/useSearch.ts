// 单例搜索 composable — 所有调用方共享同一份 ref 状态，由 editorStore 作为持久枢纽。
import { computed } from 'vue'
import { useNovelStore, useMainStore, useEditorStore } from '../store'
import { SearchResult, SearchOptions } from '@shared/types'
import { findMatches, buildMatchRegex, getPlainText } from '../utils/htmlText'

export function useSearch() {
    const mainStore = useMainStore()
    const novelStore = useNovelStore()
    const editorStore = useEditorStore()
    const s = () => editorStore.search

    const query = computed({
        get: () => s().query,
        set: (v: string) => (editorStore.search.query = v)
    })

    const replaceText = computed({
        get: () => s().replaceText,
        set: (v: string) => (editorStore.search.replaceText = v)
    })

    const options = computed<SearchOptions>({
        get: () => s().options,
        set: (v: SearchOptions) => Object.assign(editorStore.search.options, v)
    })

    const results = computed<SearchResult[]>({
        get: () => s().results,
        set: (v: SearchResult[]) => editorStore.setSearchResults(v)
    })

    const currentIndex = computed({
        get: () => s().currentIndex,
        set: (v: number) => {
            editorStore.search.currentIndex = v
        }
    })

    const isSearching = computed(() => s().isSearching)
    const currentResult = computed(() => editorStore.currentResult)
    const resultCount = computed(() => editorStore.resultCount)

    const search = (): SearchResult[] => {
        const q = s().query
        if (!q.trim()) {
            editorStore.search.results = []
            return []
        }

        editorStore.search.isSearching = true
        try {
            const { caseSensitive, wholeWord, useRegex, scope } = s().options
            const searchResults: SearchResult[] = []

            const searchChapter = (
                content: string,
                volIdx: number,
                chIdx: number,
                chapterName: string
            ) => {
                const plain = getPlainText(content)
                const matches = findMatches(plain, q, { caseSensitive, wholeWord, useRegex })
                for (const m of matches) {
                    searchResults.push({
                        volumeIndex: volIdx,
                        chapterIndex: chIdx,
                        chapterName,
                        matchText: m.text,
                        position: m.start,
                        length: m.end - m.start
                    })
                }
            }

            if (scope === 'current') {
                const ch = novelStore.currentChapter
                if (ch) {
                    searchChapter(
                        ch.content,
                        mainStore.selectedVolumeIndex,
                        mainStore.selectedChapterIndex,
                        ch.chapterName
                    )
                }
            } else {
                novelStore.volumes.forEach((volume, volIdx) => {
                    volume.chapters.forEach((chapter, chIdx) => {
                        searchChapter(chapter.content, volIdx, chIdx, chapter.chapterName)
                    })
                })
            }

            editorStore.search.results = searchResults
            editorStore.search.currentIndex = 0
            return searchResults
        } finally {
            editorStore.search.isSearching = false
        }
    }

    const next = (): SearchResult | null => {
        const r = s().results
        if (r.length === 0) return null
        editorStore.search.currentIndex = (s().currentIndex + 1) % r.length
        return editorStore.currentResult
    }

    const prev = (): SearchResult | null => {
        const r = s().results
        if (r.length === 0) return null
        editorStore.search.currentIndex = (s().currentIndex - 1 + r.length) % r.length
        return editorStore.currentResult
    }

    const goToResult = (index: number): SearchResult | null => {
        const r = s().results
        if (index < 0 || index >= r.length) return null
        editorStore.search.currentIndex = index
        return editorStore.currentResult
    }

    // 高亮搜索结果预览
    const highlightText = (text: string, maxLength = 50): string => {
        if (!s().query || !text) return text
        const q = s().query
        const { caseSensitive, wholeWord, useRegex } = s().options
        const regex = buildMatchRegex(q, { caseSensitive, wholeWord, useRegex })
        if (!regex) return text

        let displayText = text
        if (displayText.length > maxLength) {
            const matchIndex = displayText.search(regex)
            regex.lastIndex = 0
            if (matchIndex > 0) {
                const start = Math.max(0, matchIndex - 20)
                displayText = '...' + displayText.substring(start, start + maxLength) + '...'
            } else {
                displayText = displayText.substring(0, maxLength) + '...'
            }
        }

        return displayText.replace(regex, (m) => `<mark>${m}</mark>`)
    }

    const clear = (): void => {
        editorStore.search.query = ''
        editorStore.search.replaceText = ''
        editorStore.search.results = []
        editorStore.search.currentIndex = 0
        editorStore.pendingScroll = null
    }

    return {
        query,
        replaceText,
        options,
        results,
        currentIndex,
        isSearching,

        currentResult,
        resultCount,

        search,
        next,
        prev,
        goToResult,
        highlightText,
        clear
    }
}
