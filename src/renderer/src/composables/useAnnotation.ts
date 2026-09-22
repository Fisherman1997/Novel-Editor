// 标注 composable — 以 editorStore 为对话框状态枢纽，以 Tiptap mark 为正文标记。
import { computed } from 'vue'
import { useNovelStore, useMainStore, useEditorStore } from '../store'
import { Annotation, AnnotationType } from '@shared/types'
import { getAnnotatedTextFromHtml } from '../utils/htmlText'

export function useAnnotation() {
    const mainStore = useMainStore()
    const novelStore = useNovelStore()
    const editorStore = useEditorStore()

    // 当前章节的所有标注（从 chapter.annotations 元数据取）
    const currentAnnotations = computed(() => {
        const chapter = novelStore.currentChapter
        if (!chapter || !chapter.annotations) return []
        return [...chapter.annotations].sort((a, b) => b.createdAt - a.createdAt)
    })

    // 标注对话框状态
    const dialogOpen = computed(() => editorStore.annotationDialog.isOpen)
    const dialogMode = computed(() => editorStore.annotationDialog.mode)
    const createSelection = computed(() => editorStore.annotationDialog.createSelection)
    const editTarget = computed(() => editorStore.annotationDialog.editTarget)

    // 编辑目标对应的标注对象
    const editingAnnotation = computed<Annotation | null>(() => {
        const t = editorStore.annotationDialog.editTarget
        if (!t) return null
        const chapter = novelStore.volumes[t.volumeIndex]?.chapters[t.chapterIndex]
        return chapter?.annotations?.find((a) => a.id === t.annotationId) || null
    })

    // ---------- 对话框控制 ----------

    const openCreate = (selection: { from: number; to: number; text: string }) => {
        editorStore.openAnnotationCreate(selection)
    }

    const openEdit = (volumeIndex: number, chapterIndex: number, annotationId: string) => {
        editorStore.openAnnotationEdit({ volumeIndex, chapterIndex, annotationId })
    }

    const closeDialog = () => {
        editorStore.closeAnnotationDialog()
    }

    // ---------- CRUD ----------

    const addAnnotation = (
        type: AnnotationType,
        content: string,
        color?: string
    ): Annotation | null => {
        const sel = editorStore.annotationDialog.createSelection
        if (!sel) return null

        const annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'> = {
            type,
            content,
            color
        }

        novelStore.addAnnotation(
            mainStore.selectedVolumeIndex,
            mainStore.selectedChapterIndex,
            annotation
        )

        closeDialog()
        // 返回刚添加的标注
        const chapter = novelStore.currentChapter
        if (chapter?.annotations?.length) {
            return chapter.annotations[chapter.annotations.length - 1]
        }
        return null
    }

    const removeAnnotation = (annotationId: string) => {
        // 同时从正文 HTML 中移除 mark 和从元数据中删除
        novelStore.removeAnnotationWithMark(
            mainStore.selectedVolumeIndex,
            mainStore.selectedChapterIndex,
            annotationId
        )
    }

    const updateAnnotation = (annotationId: string, data: Partial<Annotation>) => {
        novelStore.updateAnnotation(
            mainStore.selectedVolumeIndex,
            mainStore.selectedChapterIndex,
            annotationId,
            data
        )
    }

    const updateColor = (annotationId: string, color: string) => {
        novelStore.updateAnnotationColor(
            mainStore.selectedVolumeIndex,
            mainStore.selectedChapterIndex,
            annotationId,
            color
        )
    }

    const linkToCharacter = (annotationId: string, characterId: string) => {
        novelStore.linkAnnotationToCharacter(
            mainStore.selectedVolumeIndex,
            mainStore.selectedChapterIndex,
            annotationId,
            characterId
        )
    }

    const linkToChapter = (
        annotationId: string,
        targetVolumeIndex: number,
        targetChapterIndex: number
    ) => {
        novelStore.linkAnnotationToChapter(
            mainStore.selectedVolumeIndex,
            mainStore.selectedChapterIndex,
            annotationId,
            targetVolumeIndex,
            targetChapterIndex
        )
    }

    // ---------- 查询 ----------

    // 从章节正文 HTML 中取标注对应的文本
    const getAnnotatedText = (volumeIndex: number, chapterIndex: number, annotationId: string) => {
        const content = novelStore.volumes[volumeIndex]?.chapters[chapterIndex]?.content || ''
        return getAnnotatedTextFromHtml(content, annotationId)
    }

    const getAnnotationTooltip = (annotation: Annotation): string => {
        switch (annotation.type) {
            case 'highlight':
                return `高亮: ${annotation.content}`
            case 'note':
                return `备注: ${annotation.content}`
            case 'link':
                if (annotation.linkedCharacterId) {
                    const character = novelStore.characters.find(
                        (c) => c.id === annotation.linkedCharacterId
                    )
                    return `链接到人物: ${character?.name || '未知'}`
                }
                if (annotation.linkedChapter) {
                    const { volumeIndex, chapterIndex } = annotation.linkedChapter
                    const chapter = novelStore.volumes[volumeIndex]?.chapters[chapterIndex]
                    return `链接到章节: ${chapter?.chapterName || '未知'}`
                }
                return `链接: ${annotation.content}`
            default:
                return annotation.content
        }
    }

    return {
        // 状态
        currentAnnotations,
        dialogOpen,
        dialogMode,
        createSelection,
        editTarget,
        editingAnnotation,

        // 对话框控制
        openCreate,
        openEdit,
        closeDialog,

        // CRUD
        addAnnotation,
        removeAnnotation,
        updateAnnotation,
        updateColor,
        linkToCharacter,
        linkToChapter,

        // 查询
        getAnnotatedText,
        getAnnotationTooltip
    }
}
