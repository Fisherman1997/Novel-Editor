// 基于 DOM 的 HTML 文本工具
//
// 章节正文以 Tiptap HTML 存储。直接对 HTML 字符串做正则搜索/替换会匹配到
// 标签与属性并损坏结构，这里统一通过 DOMParser 在文本节点层面操作。
// "纯文本偏移"定义为：按文档顺序拼接所有文本节点（不加任何分隔符）后的偏移。

export interface PlainMatch {
    start: number
    end: number
    text: string
}

export interface MatchOptions {
    caseSensitive?: boolean
    wholeWord?: boolean
    useRegex?: boolean
}

// 防御性上限，避免灾难性正则导致界面卡死
const MAX_MATCHES = 1000

// 提取 HTML 的纯文本（所有文本节点拼接）
export function getPlainText(html: string): string {
    if (!html) return ''
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent || ''
}

// 构建搜索正则；非法正则返回 null
export function buildMatchRegex(query: string, options: MatchOptions): RegExp | null {
    if (!query) return null

    let pattern = query
    if (!options.useRegex) {
        pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    if (options.wholeWord) {
        pattern = `\\b(?:${pattern})\\b`
    }

    try {
        return new RegExp(pattern, options.caseSensitive ? 'g' : 'gi')
    } catch {
        return null
    }
}

// 在纯文本中查找所有匹配
export function findMatches(text: string, query: string, options: MatchOptions): PlainMatch[] {
    const regex = buildMatchRegex(query, options)
    if (!regex) return []

    const matches: PlainMatch[] = []
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
        if (m[0].length === 0) {
            // 零长度匹配（如 a*）会造成死循环，强制前进
            regex.lastIndex++
            continue
        }
        matches.push({ start: m.index, end: m.index + m[0].length, text: m[0] })
        if (matches.length >= MAX_MATCHES) break
    }
    return matches
}

// 截取匹配位置的上下文用于结果列表展示
export function getMatchContext(text: string, start: number, end: number, radius = 24): string {
    const contextStart = Math.max(0, start - radius)
    const contextEnd = Math.min(text.length, end + radius)
    const before = (contextStart > 0 ? '...' : '') + text.slice(contextStart, start)
    const after = text.slice(end, contextEnd) + (contextEnd < text.length ? '...' : '')
    return before + '\u0000' + text.slice(start, end) + '\u0000' + after
}

// 将纯文本偏移表示的匹配替换写入 HTML（不影响标签结构）
// 策略：Tiptap HTML 通常只有简单的 block/inline 标签，我们按标签分割后
// 对文本片段做替换，保持标签完整。
export function replaceMatchesInHtml(
    html: string,
    matches: PlainMatch[],
    replacement: string
): string {
    if (matches.length === 0) return html

    // 提取所有文本片段及其在纯文本中的偏移
    const textFragments: Array<{ text: string; start: number; htmlOffset: number }> = []
    let plainOffset = 0
    const tagRe = /<[^>]+>/g
    let lastTagEnd = 0
    let match: RegExpExecArray | null

    while ((match = tagRe.exec(html)) !== null) {
        // 标签前的文本
        if (match.index > lastTagEnd) {
            const textContent = html.slice(lastTagEnd, match.index)
            textFragments.push({
                text: textContent,
                start: plainOffset,
                htmlOffset: lastTagEnd
            })
            plainOffset += textContent.length
        }
        lastTagEnd = match.index + match[0].length
    }
    // 尾部文本
    if (lastTagEnd < html.length) {
        const textContent = html.slice(lastTagEnd)
        textFragments.push({ text: textContent, start: plainOffset, htmlOffset: lastTagEnd })
    }

    const total = plainOffset

    // 按 start 从后往前替换
    const sorted = [...matches].sort((a, b) => b.start - a.start)
    let result = html

    for (const m of sorted) {
        if (m.start < 0 || m.end > total || m.end <= m.start) continue

        // 找到涉及的文本片段
        const involved = textFragments.filter(
            (f) => f.start + f.text.length > m.start && f.start < m.end
        )
        if (involved.length === 0) continue

        // 计算每个片段内的替换范围
        const first = involved[0]
        const last = involved[involved.length - 1]
        const firstLocalStart = Math.max(m.start, first.start) - first.start
        const lastLocalEnd = Math.min(m.end, last.start + last.text.length) - last.start

        // 构建替换后的 HTML 片段
        const beforeHtml = result.slice(0, first.htmlOffset + firstLocalStart)
        const afterHtml = result.slice(last.htmlOffset + lastLocalEnd)

        result = beforeHtml + replacement + afterHtml

        // 重建 textFragments（偏移已变，后续匹配用 from 后的偏移不变）
        // 因为从后往前处理，不影响前面的偏移
    }

    return result
}

// ---------- 标注相关 ----------

// annotationId 为 uuid，仅防御性过滤引号与反斜杠
const safeId = (id: string): string => id.replace(/["\\]/g, '')

const annotationSelector = (annotationId: string): string =>
    `mark[data-annotation-id="${safeId(annotationId)}"]`

// 从 HTML 中取标注覆盖的文本；找不到返回空字符串
export function getAnnotatedTextFromHtml(html: string, annotationId: string): string {
    if (!html || !annotationId) return ''
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const el = doc.body.querySelector(annotationSelector(annotationId))
    return el ? el.textContent || '' : ''
}

// 从 HTML 中移除标注（解除 mark 包裹，保留正文）
export function unwrapAnnotationFromHtml(html: string, annotationId: string): string {
    if (!html || !annotationId) return html
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.body.querySelectorAll(annotationSelector(annotationId)).forEach((el) => {
        const parent = el.parentNode
        if (!parent) return
        while (el.firstChild) {
            parent.insertBefore(el.firstChild, el)
        }
        parent.removeChild(el)
        parent.normalize()
    })
    return doc.body.innerHTML
}

// 更新 HTML 中标注的颜色属性
export function updateAnnotationColorInHtml(
    html: string,
    annotationId: string,
    color: string
): string {
    if (!html || !annotationId) return html
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.body.querySelectorAll(annotationSelector(annotationId)).forEach((el) => {
        el.setAttribute('data-color', color)
        ;(el as HTMLElement).style.backgroundColor = color
    })
    return doc.body.innerHTML
}
