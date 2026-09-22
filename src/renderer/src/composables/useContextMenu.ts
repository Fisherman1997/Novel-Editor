import { ref, onMounted, onUnmounted } from 'vue'

export interface MenuItem {
    label?: string
    icon?: string
    shortcut?: string
    danger?: boolean
    disabled?: boolean
    divider?: boolean
    action?: () => void
}

export function useContextMenu() {
    const isVisible = ref(false)
    const x = ref(0)
    const y = ref(0)
    const items = ref<MenuItem[]>([])

    const show = (event: MouseEvent, menuItems: MenuItem[]) => {
        event.preventDefault()
        event.stopPropagation()

        // 计算菜单位置，确保不超出视口
        const menuWidth = 200
        const menuHeight = menuItems.length * 36

        let posX = event.clientX
        let posY = event.clientY

        if (posX + menuWidth > window.innerWidth) {
            posX = window.innerWidth - menuWidth - 8
        }
        if (posY + menuHeight > window.innerHeight) {
            posY = window.innerHeight - menuHeight - 8
        }

        x.value = posX
        y.value = posY
        items.value = menuItems
        isVisible.value = true
    }

    const hide = () => {
        isVisible.value = false
        items.value = []
    }

    const handleClickOutside = () => {
        hide()
    }

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') hide()
    }

    onMounted(() => {
        document.addEventListener('click', handleClickOutside)
        document.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('keydown', handleKeydown)
    })

    return {
        isVisible,
        x,
        y,
        items,
        show,
        hide
    }
}
