// AI 助手上下文快照构建
//
// 输入必须是书籍数据的普通对象副本（toRaw / 手工拷贝），产出只含字符串与
// 数字的纯数据快照（AgentContextSnapshot）。快照一旦冻结即不引用 store，
// 后续编辑书稿不会影响已捕获的上下文 —— 这是「Agent 永不修改书稿」铁律的
// 数据层保证之一：agent 只拿到不可变纯文本，拿不到可写引用。

import type {
    Volume,
    Character,
    WorldView,
    AgentContextScope,
    AgentContextSnapshot
} from '@shared/types'
import { getPlainText } from './htmlText'

// 截断上限（chars），见 AI-AGENT-PLAN.md §6
export const OUTLINE_MAX_CHARS = 8000
export const CURRENT_CHAPTER_MAX_CHARS = 24000
export const FULL_BOOK_MAX_CHARS = 48000
export const MATERIALS_MAX_CHARS = 8000

const HEAD_TAIL_MARKER = '……（中间省略）……'
const TAIL_MARKER = '\n……（以下内容已省略）……'

// 当前章定位（当前无 activeChapterId，用卷/章索引二元组）
export interface CurrentChapterRef {
    volumeIndex: number
    chapterIndex: number
}

// 构建快照的输入：书籍纯数据副本
export interface AgentSnapshotInput {
    bookName: string
    volumes: Volume[]
    characters: Character[]
    worldViews: WorldView[]
}

// 头 + 尾保留，中间插入省略标记；总长不超过 max
export function truncateHeadTail(text: string, max: number): string {
    if (!text || max <= 0) return ''
    if (text.length <= max) return text
    if (max <= HEAD_TAIL_MARKER.length) return text.slice(0, max)
    const keep = max - HEAD_TAIL_MARKER.length
    const head = Math.ceil(keep / 2)
    const tail = keep - head
    return text.slice(0, head) + HEAD_TAIL_MARKER + text.slice(text.length - tail)
}

// 保留头部，尾部截断（大纲用）
export function truncateHead(text: string, max: number): string {
    if (!text || max <= 0) return ''
    if (text.length <= max) return text
    if (max <= TAIL_MARKER.length) return text.slice(0, max)
    return text.slice(0, max - TAIL_MARKER.length) + TAIL_MARKER
}

// 卷/章标题树 + 卷章说明（纯文本）
function buildOutlineText(volumes: Volume[]): string {
    const lines: string[] = []
    volumes.forEach((vol, vi) => {
        lines.push(`${vi + 1}. ${vol.volumeName}`)
        if (vol.volumeSummary) {
            lines.push(`   卷说明：${vol.volumeSummary}`)
        }
        vol.chapters.forEach((ch, ci) => {
            lines.push(`   ${ci + 1}. ${ch.chapterName}`)
            if (ch.chapterSummary) {
                lines.push(`      章说明：${ch.chapterSummary}`)
            }
        })
    })
    return lines.join('\n')
}

// 当前章纯文本（HTML → 纯文本，不泄露标签）
function getChapterBody(volumes: Volume[], ref: CurrentChapterRef): string {
    const chapter = volumes[ref.volumeIndex]?.chapters[ref.chapterIndex]
    if (!chapter) return ''
    return getPlainText(chapter.content)
}

// 全书纯文本拼接
function buildFullBookText(volumes: Volume[]): string {
    const parts: string[] = []
    volumes.forEach((vol) => {
        parts.push(`【${vol.volumeName}】`)
        vol.chapters.forEach((ch) => {
            parts.push(`【${ch.chapterName}】`)
            parts.push(getPlainText(ch.content))
        })
    })
    return parts.join('\n')
}

// 人物 + 世界观资料纯文本
function buildMaterialsText(characters: Character[], worldViews: WorldView[]): string {
    const parts: string[] = []

    if (characters.length > 0) {
        parts.push('—— 人物资料 ——')
        characters.forEach((c) => {
            const lines = [`人物：${c.name}`]
            if (c.personality) lines.push(`性格：${c.personality}`)
            if (c.appearance) lines.push(`外貌：${c.appearance}`)
            if (c.ageOfAppearance) lines.push(`出场年龄：${c.ageOfAppearance}`)
            if (c.content) lines.push(`描述：${c.content}`)
            parts.push(lines.join('\n'))
        })
    }

    if (worldViews.length > 0) {
        parts.push('—— 世界观资料 ——')
        worldViews.forEach((w) => {
            const lines = [`设定：${w.name}`]
            if (w.settings && w.settings.length > 0) {
                lines.push(`要点：${w.settings.map((s, i) => `${i + 1}. ${s}`).join('；')}`)
            }
            if (w.content) lines.push(`描述：${w.content}`)
            parts.push(lines.join('\n'))
        })
    }

    return parts.join('\n')
}

const SCOPE_LABEL: Record<AgentContextScope, string> = {
    outline: '大纲',
    currentChapter: '当前章',
    fullBook: '全书'
}

export function getScopeLabel(scope: AgentContextScope): string {
    return SCOPE_LABEL[scope]
}

// 按 scope 冻结一份只读纯文本快照
export function buildAgentContextSnapshot(
    input: AgentSnapshotInput,
    scope: AgentContextScope,
    currentRef?: CurrentChapterRef | null,
    now: number = Date.now()
): AgentContextSnapshot {
    let originalChars = 0
    let keptChars = 0
    let truncated = false

    const track = (raw: string, result: string) => {
        originalChars += raw.length
        keptChars += result.length
        if (result.length < raw.length) truncated = true
    }

    const outlineRaw = buildOutlineText(input.volumes)
    const outline = truncateHead(outlineRaw, OUTLINE_MAX_CHARS)
    track(outlineRaw, outline)

    let chapterRef: AgentContextSnapshot['chapterRef']
    let bodyText: string | undefined

    if (scope === 'currentChapter' && currentRef) {
        const volume = input.volumes[currentRef.volumeIndex]
        const chapter = volume?.chapters[currentRef.chapterIndex]
        if (chapter) {
            chapterRef = {
                volumeIndex: currentRef.volumeIndex,
                chapterIndex: currentRef.chapterIndex,
                chapterName: chapter.chapterName
            }
            const raw = getChapterBody(input.volumes, currentRef)
            bodyText = truncateHeadTail(raw, CURRENT_CHAPTER_MAX_CHARS)
            track(raw, bodyText)
        }
    } else if (scope === 'fullBook') {
        const raw = buildFullBookText(input.volumes)
        bodyText = truncateHeadTail(raw, FULL_BOOK_MAX_CHARS)
        track(raw, bodyText)
    }

    const materialsRaw = buildMaterialsText(input.characters, input.worldViews)
    const materials = truncateHeadTail(materialsRaw, MATERIALS_MAX_CHARS)
    track(materialsRaw, materials)

    return {
        capturedAt: now,
        scope,
        bookName: input.bookName,
        outline,
        chapterRef,
        bodyText,
        materials,
        truncation: { truncated, originalChars, keptChars }
    }
}
