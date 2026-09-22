// ProseMirror 文档与"纯文本偏移"之间的换算工具。
// 纯文本偏移的定义与 utils/htmlText.ts 保持一致：按文档顺序拼接所有文本节点。

import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

// 文档的纯文本（所有文本节点拼接）
export function docToPlainText(doc: ProseMirrorNode): string {
    let text = ''
    doc.descendants((node) => {
        if (node.isText && node.text) text += node.text
    })
    return text
}

// 将纯文本偏移转换为 ProseMirror 位置；超出范围返回 null
export function textOffsetToPos(doc: ProseMirrorNode, offset: number): number | null {
    if (offset < 0) return null

    let acc = 0
    let result: number | null = null

    doc.descendants((node, pos) => {
        if (result !== null || !node.isText || !node.text) return
        const len = node.text.length
        if (offset <= acc + len) {
            result = pos + Math.min(offset - acc, len)
        }
        acc += len
    })

    return result
}

// 查找文档中某个标注的所有连续区间（编辑正文后一个标注可能分裂成多段）
export function findAnnotationRanges(
    doc: ProseMirrorNode,
    annotationId: string
): Array<{ from: number; to: number }> {
    const ranges: Array<{ from: number; to: number }> = []

    doc.descendants((node, pos) => {
        if (!node.isText) return
        const mark = node.marks.find(
            (m) => m.type.name === 'annotation' && m.attrs.annotationId === annotationId
        )
        if (!mark) return

        const last = ranges[ranges.length - 1]
        if (last && last.to === pos) {
            last.to = pos + node.nodeSize
        } else {
            ranges.push({ from: pos, to: pos + node.nodeSize })
        }
    })

    return ranges
}
