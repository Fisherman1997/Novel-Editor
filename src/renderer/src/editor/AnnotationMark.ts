// 标注 Mark：以 <mark data-annotation-id="..." data-color="..."> 内嵌于正文 HTML。
// 文本范围由 mark 本身承载（随编辑自动保持），元数据（备注/链接/时间）存于 chapter.annotations。
import { Mark, mergeAttributes } from '@tiptap/core'

export interface AnnotationMarkAttrs {
    annotationId: string | null
    color: string
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        annotation: {
            setAnnotation: (attrs: AnnotationMarkAttrs) => ReturnType
            unsetAnnotation: () => ReturnType
        }
    }
}

export const AnnotationMark = Mark.create({
    name: 'annotation',

    // 光标移到标注边缘时不自动延续标注
    inclusive: false,

    addAttributes() {
        return {
            annotationId: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-annotation-id'),
                renderHTML: (attributes) => ({ 'data-annotation-id': attributes.annotationId })
            },
            color: {
                default: '#ffeb3b',
                parseHTML: (element) =>
                    element.getAttribute('data-color') ||
                    element.style.backgroundColor ||
                    '#ffeb3b',
                renderHTML: (attributes) => ({
                    'data-color': attributes.color,
                    style: `background-color: ${attributes.color}`
                })
            }
        }
    },

    parseHTML() {
        // 只认带 data-annotation-id 的 mark，避免与 Highlight 扩展的 <mark> 冲突
        return [{ tag: 'mark[data-annotation-id]' }]
    },

    renderHTML({ HTMLAttributes }) {
        return ['mark', mergeAttributes(HTMLAttributes), 0]
    },

    addCommands() {
        return {
            setAnnotation:
                (attrs) =>
                ({ commands }) =>
                    commands.setMark('annotation', attrs),
            unsetAnnotation:
                () =>
                ({ commands }) =>
                    commands.unsetMark('annotation')
        }
    }
})
