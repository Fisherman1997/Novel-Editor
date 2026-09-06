import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMainStore, useNovelStore } from '../store'
import { useDebounceFn } from '@vueuse/core'

interface AutoSaveState {
  isSaving: boolean
  lastSavedAt: number | null
  saveCount: number
  error: string | null
}

export function useAutoSave() {
  const mainStore = useMainStore()
  const novelStore = useNovelStore()

  const state = ref<AutoSaveState>({
    isSaving: false,
    lastSavedAt: null,
    saveCount: 0,
    error: null
  })

  let saveTimer: ReturnType<typeof setInterval> | null = null

  // 是否需要保存
  const needsSave = computed(() => mainStore.isDirty && mainStore.currentFilePath)

  // 格式化最后保存时间
  const formattedLastSaved = computed(() => {
    if (!state.value.lastSavedAt) return '未保存'
    const date = new Date(state.value.lastSavedAt)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  })

  // 保存函数
  const save = async (): Promise<boolean> => {
    if (!needsSave.value || state.value.isSaving) {
      return false
    }

    state.value.isSaving = true
    state.value.error = null

    try {
      const filePath = mainStore.currentFilePath!
      const data = novelStore.toJSON()

      const result = await window.api.writeFile(filePath, data)

      if (result.success) {
        mainStore.markSaved()
        state.value.lastSavedAt = Date.now()
        state.value.saveCount++
        console.log('自动保存成功:', filePath)
        return true
      } else {
        state.value.error = result.error || '保存失败'
        console.error('自动保存失败:', result.error)
        return false
      }
    } catch (error) {
      state.value.error = (error as Error).message
      console.error('自动保存异常:', error)
      return false
    } finally {
      state.value.isSaving = false
    }
  }

  // 防抖保存（内容变化后延迟保存）
  const debouncedSave = useDebounceFn(save, mainStore.autoSave.delay)

  // 启动定时保存
  const startAutoSave = (): void => {
    if (saveTimer) return

    saveTimer = setInterval(() => {
      if (needsSave.value) {
        save()
      }
    }, mainStore.autoSave.interval)

    console.log('自动保存已启动，间隔:', mainStore.autoSave.interval, 'ms')
  }

  // 停止定时保存
  const stopAutoSave = (): void => {
    if (saveTimer) {
      clearInterval(saveTimer)
      saveTimer = null
      console.log('自动保存已停止')
    }
  }

  // 重启自动保存
  const restartAutoSave = (): void => {
    stopAutoSave()
    if (mainStore.autoSave.enabled) {
      startAutoSave()
    }
  }

  // 监听内容变化，触发防抖保存
  watch(
    () => mainStore.isDirty,
    (dirty) => {
      if (dirty && mainStore.autoSave.enabled) {
        debouncedSave()
      }
    }
  )

  // 监听自动保存配置变化
  watch(
    () => mainStore.autoSave.enabled,
    (enabled) => {
      if (enabled) {
        startAutoSave()
      } else {
        stopAutoSave()
      }
    }
  )

  // 组件挂载时启动自动保存
  onMounted(() => {
    if (mainStore.autoSave.enabled) {
      startAutoSave()
    }
  })

  // 组件卸载时停止自动保存
  onUnmounted(() => {
    stopAutoSave()
  })

  // 保存当前状态（用于关闭窗口前）
  const saveBeforeClose = async (): Promise<boolean> => {
    if (needsSave.value) {
      return await save()
    }
    return true
  }

  // 清除错误
  const clearError = (): void => {
    state.value.error = null
  }

  return {
    // 状态
    isSaving: computed(() => state.value.isSaving),
    lastSavedAt: computed(() => state.value.lastSavedAt),
    formattedLastSaved,
    saveCount: computed(() => state.value.saveCount),
    error: computed(() => state.value.error),
    needsSave,

    // 方法
    save,
    debouncedSave,
    startAutoSave,
    stopAutoSave,
    restartAutoSave,
    saveBeforeClose,
    clearError
  }
}
