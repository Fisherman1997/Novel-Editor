<template>
  <div class="app-right" :style="{ width: `${mainStore.rightPanelWidth}px` }">
    <div class="panel-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <AppIcon :name="tab.icon" :size="14" />
        {{ tab.label }}
        <span class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <div class="panel-content">
      <CharacterList v-if="activeTab === 'characters'" />
      <WorldViewList v-else-if="activeTab === 'worldViews'" />
      <AnnotationList v-else-if="activeTab === 'annotations'" />
    </div>

    <!-- 面板宽度调整手柄 -->
    <div class="resize-handle" @mousedown="startResize">
      <div class="handle-bar"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useMainStore, useNovelStore } from '../../store'
import CharacterList from '../novel/CharacterList.vue'
import WorldViewList from '../novel/WorldViewList.vue'
import AnnotationList from '../novel/AnnotationList.vue'
import AppIcon from '../common/AppIcon.vue'

const mainStore = useMainStore()
const novelStore = useNovelStore()

type TabKey = 'characters' | 'worldViews' | 'annotations'

const activeTab = computed({
  get: () => mainStore.rightPanelTab,
  set: (v: TabKey) => { mainStore.rightPanelTab = v }
})

const tabs = computed(() => [
  { key: 'characters' as TabKey, label: '人物', icon: 'users', count: novelStore.characters.length },
  { key: 'worldViews' as TabKey, label: '设定', icon: 'globe', count: novelStore.worldViews.length },
  { key: 'annotations' as TabKey, label: '标注', icon: 'message-square', count: novelStore.allAnnotations.length }
])

const switchTab = (key: TabKey) => {
  activeTab.value = key
}

// 面板宽度调整
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = mainStore.rightPanelWidth

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return

  const diff = startX.value - e.clientX
  mainStore.updateRightPanelWidth(startWidth.value + diff)
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.app-right {
  position: relative;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
  background: var(--bg-subtle);
  flex-shrink: 0;
}

// ---------- 分段式标签 ----------
.panel-tabs {
  display: flex;
  gap: 4px;
  padding: @spacing-sm @spacing-md;
  border-bottom: 1px solid var(--border);

  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 30px;
    padding: 0 8px;
    border: none;
    border-radius: @radius-md;
    background: transparent;
    color: var(--text-2);
    font-size: @font-size-base;
    cursor: pointer;
    transition: all @transition-fast;

    .tab-count {
      font-size: @font-size-xs;
      color: var(--text-3);
      background: var(--bg-inset);
      border-radius: @radius-full;
      padding: 0 6px;
      line-height: 16px;
      transition: all @transition-fast;
    }

    &:hover {
      background: var(--hover);
      color: var(--text-1);
    }

    &.is-active {
      background: var(--bg-surface);
      color: var(--accent);
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border);

      .tab-count {
        background: var(--accent-soft);
        color: var(--accent);
      }
    }
  }
}

.panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.resize-handle {
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  .handle-bar {
    width: 3px;
    height: 32px;
    background: var(--border-strong);
    border-radius: 2px;
    transition: background @transition-normal;
  }

  &:hover .handle-bar {
    background: var(--accent);
  }
}
</style>
