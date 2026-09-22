import { ref } from 'vue'

export interface DragState {
    draggingIndex: number | null
    dragOverIndex: number | null
}

export function useDragSort(onReorder: (from: number, to: number) => void) {
    const dragState = ref<DragState>({
        draggingIndex: null,
        dragOverIndex: null
    })

    const onDragStart = (index: number, event: DragEvent) => {
        dragState.value.draggingIndex = index
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move'
            // 设置拖拽图像为当前元素
            const target = event.target as HTMLElement
            event.dataTransfer.setDragImage(target, 0, 0)
        }
    }

    const onDragOver = (index: number, event: DragEvent) => {
        event.preventDefault()
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move'
        }
        dragState.value.dragOverIndex = index
    }

    const onDragLeave = () => {
        dragState.value.dragOverIndex = null
    }

    const onDrop = (index: number, event: DragEvent) => {
        event.preventDefault()
        const from = dragState.value.draggingIndex
        if (from !== null && from !== index) {
            onReorder(from, index)
        }
        reset()
    }

    const onDragEnd = () => {
        reset()
    }

    const reset = () => {
        dragState.value.draggingIndex = null
        dragState.value.dragOverIndex = null
    }

    return {
        dragState,
        onDragStart,
        onDragOver,
        onDragLeave,
        onDrop,
        onDragEnd
    }
}
