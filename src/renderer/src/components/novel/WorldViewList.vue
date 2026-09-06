<template>
  <div class="worldview-list">
    <div class="list-header">
      <span class="list-title">世界观设定</span>
      <button class="add-btn" @click="addWorldView">
        <AppIcon name="plus" :size="13" />
        添加
      </button>
    </div>

    <div class="list-content" v-if="novelStore.worldViews.length > 0">
      <div
        v-for="(worldView, index) in novelStore.worldViews"
        :key="worldView.id"
        class="worldview-item"
        :class="{
          'is-selected': selectedIndex === index,
          'is-drag-over': dragState.dragOverIndex === index
        }"
        draggable="true"
        @click="selectWorldView(index)"
        @dragstart="onDragStart(index, $event)"
        @dragover="onDragOver(index, $event)"
        @dragleave="onDragLeave()"
        @drop="onDrop(index, $event)"
        @dragend="onDragEnd()"
      >
        <span class="item-icon">
          <AppIcon name="globe" :size="15" />
        </span>
        <div class="worldview-info">
          <div class="worldview-name">
            <InlineEdit
              :value="worldView.name"
              @change="(val) => updateWorldViewName(index, val)"
            />
          </div>
          <div class="worldview-preview text-ellipsis" v-if="worldView.content">
            {{ worldView.content }}
          </div>
          <div class="worldview-tags" v-else-if="worldView.settings.length > 0">
            <span v-for="(setting, sIndex) in worldView.settings.slice(0, 3)" :key="sIndex" class="tag">
              {{ setting }}
            </span>
          </div>
        </div>
        <button class="icon-btn is-danger item-delete" @click.stop="deleteWorldView(index)" title="删除">
          <AppIcon name="trash" :size="13" />
        </button>
      </div>
    </div>

    <div v-else class="empty-state">
      <AppIcon name="globe" :size="26" class="empty-icon" />
      <p>暂无世界观设定</p>
      <p class="hint">点击"添加"创建新设定</p>
    </div>

    <!-- 世界观详情 -->
    <div v-if="selectedWorldView" class="worldview-detail">
      <div class="detail-header">
        <span>设定详情</span>
      </div>

      <div class="detail-form">
        <div class="form-item">
          <label>名称</label>
          <el-input v-model="selectedWorldView.name" placeholder="设定名称" />
        </div>

        <div class="form-item">
          <label>设定要点</label>
          <div class="settings-list">
            <div
              v-for="(_setting, sIndex) in selectedWorldView.settings"
              :key="sIndex"
              class="setting-row"
            >
              <el-input v-model="selectedWorldView.settings[sIndex]" size="small" placeholder="设定要点" />
              <button class="icon-btn is-danger remove-btn" @click="removeSetting(sIndex)">
                <AppIcon name="close" :size="13" />
              </button>
            </div>
            <button class="add-setting-btn" @click="addSetting">
              <AppIcon name="plus" :size="13" />
              添加要点
            </button>
          </div>
        </div>

        <div class="form-item">
          <label>详细描述</label>
          <el-input
            v-model="selectedWorldView.content"
            type="textarea"
            :rows="6"
            placeholder="详细描述这个世界观的规则、历史、限制..."
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNovelStore } from '../../store'
import { useDragSort } from '../../composables'
import InlineEdit from '../common/InlineEdit.vue'
import AppIcon from '../common/AppIcon.vue'
import { confirmAction } from '../../utils/confirm'

const novelStore = useNovelStore()
const selectedIndex = ref<number | null>(null)
const { dragState, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd } = useDragSort((from, to) => {
  novelStore.moveWorldView(from, to)
})

// 选中的世界观
const selectedWorldView = computed(() => {
  if (selectedIndex.value === null) return null
  return novelStore.worldViews[selectedIndex.value] || null
})

// 选择世界观
const selectWorldView = (index: number) => {
  selectedIndex.value = index
}

// 添加世界观
const addWorldView = () => {
  novelStore.addWorldView()
  // 选中新添加的世界观
  selectedIndex.value = novelStore.worldViews.length - 1
}

// 删除世界观
const deleteWorldView = async (index: number) => {
  const name = novelStore.worldViews[index]?.name || '该设定'
  const ok = await confirmAction(`确定删除设定「${name}」吗？`, '删除设定')
  if (ok) {
    novelStore.deleteWorldView(index)
    if (selectedIndex.value === index) {
      selectedIndex.value = null
    } else if (selectedIndex.value !== null && selectedIndex.value > index) {
      selectedIndex.value--
    }
  }
}

// 更新世界观名称
const updateWorldViewName = (index: number, name: string) => {
  novelStore.updateWorldView(index, { name })
}

// 添加设定要点
const addSetting = () => {
  if (selectedWorldView.value) {
    selectedWorldView.value.settings.push('')
    novelStore.markDirty()
  }
}

// 移除设定要点
const removeSetting = (index: number) => {
  if (selectedWorldView.value) {
    selectedWorldView.value.settings.splice(index, 1)
    novelStore.markDirty()
  }
}

// 监听表单字段变化，触发脏标记
watch(
  () => selectedWorldView.value,
  () => {
    novelStore.markDirty()
  },
  { deep: true }
)
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.worldview-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: @spacing-md @spacing-md @spacing-sm;

  .list-title {
    font-size: @font-size-base;
    font-weight: @font-weight-semibold;
    color: var(--text-1);
  }

  .add-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border: none;
    background: var(--accent-soft);
    color: var(--accent);
    border-radius: @radius-md;
    cursor: pointer;
    font-size: @font-size-sm;
    font-weight: @font-weight-medium;
    transition: all @transition-fast;

    &:hover {
      background: var(--accent);
      color: var(--accent-contrast);
    }
  }
}

.list-content {
  flex: 1;
  min-height: 120px;
  max-height: 240px;
  overflow-y: auto;
  padding: 0 @spacing-sm;
}

.worldview-item {
  display: flex;
  align-items: center;
  gap: @spacing-md;
  padding: 8px @spacing-sm;
  border-radius: @radius-md;
  cursor: grab;
  transition: background @transition-fast;

  &:hover {
    background: var(--hover);

    .item-delete {
      opacity: 1;
    }
  }

  &.is-selected {
    background: var(--accent-soft);
  }

  &.is-drag-over {
    box-shadow: inset 0 2px 0 var(--accent);
  }

  &:active {
    cursor: grabbing;
  }

  .item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: @radius-md;
    background: var(--bg-inset);
    color: var(--text-2);
    flex-shrink: 0;
  }

  .worldview-info {
    flex: 1;
    min-width: 0;

    .worldview-name {
      font-weight: @font-weight-medium;
      color: var(--text-1);
      font-size: @font-size-base;
    }

    .worldview-preview {
      font-size: @font-size-sm;
      color: var(--text-3);
      margin-top: 1px;
    }

    .worldview-tags {
      display: flex;
      gap: 4px;
      margin-top: 3px;
      overflow: hidden;

      .tag {
        font-size: @font-size-xs;
        color: var(--text-2);
        background: var(--bg-inset);
        border-radius: @radius-full;
        padding: 1px 7px;
        flex-shrink: 0;
      }
    }
  }

  .item-delete {
    width: 24px;
    height: 24px;
    opacity: 0;
    flex-shrink: 0;
    transition: opacity @transition-fast;
  }
}

// ---------- 详情 ----------
.worldview-detail {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
  overflow-y: auto;

  .detail-header {
    padding: @spacing-sm @spacing-md;
    border-bottom: 1px solid var(--border);

    span {
      font-size: @font-size-base;
      font-weight: @font-weight-semibold;
      color: var(--text-1);
    }
  }

  .detail-form {
    padding: @spacing-md;

    .form-item {
      margin-bottom: @spacing-md;

      &:last-child {
        margin-bottom: 0;
      }

      label {
        display: block;
        font-size: @font-size-sm;
        font-weight: @font-weight-medium;
        color: var(--text-2);
        margin-bottom: @spacing-xs;
      }

      :deep(.el-textarea) {
        resize: none;
      }
    }

    .settings-list {
      .setting-row {
        display: flex;
        align-items: center;
        gap: @spacing-xs;
        margin-bottom: @spacing-sm;

        .el-input {
          flex: 1;
        }

        .remove-btn {
          width: 24px;
          height: 24px;
        }
      }

      .add-setting-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        width: 100%;
        padding: 7px;
        border: 1px dashed var(--border-strong);
        background: transparent;
        border-radius: @radius-md;
        cursor: pointer;
        color: var(--text-3);
        font-size: @font-size-sm;
        transition: all @transition-fast;

        &:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-soft);
        }
      }
    }
  }
}
</style>
