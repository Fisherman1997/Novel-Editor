import { computed } from 'vue'
import { useMainStore } from '../store'

export function usePanelCollapse() {
  const mainStore = useMainStore()

  // 左侧导航
  const isLeftCollapsed = computed({
    get: () => mainStore.leftPanelCollapsed,
    set: (v: boolean) => { mainStore.leftPanelCollapsed = v }
  })

  const toggleLeftPanel = () => {
    isLeftCollapsed.value = !isLeftCollapsed.value
  }

  // 右侧面板
  const isRightCollapsed = computed({
    get: () => mainStore.rightPanelCollapsed,
    set: (v: boolean) => { mainStore.rightPanelCollapsed = v }
  })

  const toggleRightPanel = () => {
    isRightCollapsed.value = !isRightCollapsed.value
  }

  // 全屏模式（同时隐藏左右面板）
  const isFullscreen = computed({
    get: () => isLeftCollapsed.value && isRightCollapsed.value,
    set: (v: boolean) => {
      isLeftCollapsed.value = v
      isRightCollapsed.value = v
    }
  })

  const toggleFullscreen = () => {
    if (isFullscreen.value) {
      // 退出全屏：恢复之前的面板状态（默认展开）
      isLeftCollapsed.value = false
      isRightCollapsed.value = false
    } else {
      isLeftCollapsed.value = true
      isRightCollapsed.value = true
    }
  }

  const exitFullscreen = () => {
    if (isFullscreen.value) {
      isLeftCollapsed.value = false
      isRightCollapsed.value = false
    }
  }

  return {
    isLeftCollapsed,
    toggleLeftPanel,
    isRightCollapsed,
    toggleRightPanel,
    isFullscreen,
    toggleFullscreen,
    exitFullscreen
  }
}
