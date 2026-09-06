<template>
  <div class="character-list">
    <div class="list-header">
      <span class="list-title">人物</span>
      <button class="add-btn" @click="addCharacter">
        <AppIcon name="plus" :size="13" />
        添加
      </button>
    </div>

    <div class="list-content" v-if="novelStore.characters.length > 0">
      <div
        v-for="(character, index) in novelStore.characters"
        :key="character.id"
        class="character-item"
        :class="{
          'is-selected': selectedIndex === index,
          'is-drag-over': dragState.dragOverIndex === index
        }"
        draggable="true"
        @click="selectCharacter(index)"
        @dragstart="onDragStart(index, $event)"
        @dragover="onDragOver(index, $event)"
        @dragleave="onDragLeave()"
        @drop="onDrop(index, $event)"
        @dragend="onDragEnd()"
      >
        <span class="avatar" :style="{ background: avatarColor(index) }">
          {{ character.name.charAt(0) || '?' }}
        </span>
        <div class="character-info">
          <div class="character-name">
            <InlineEdit
              :value="character.name"
              @change="(val) => updateCharacterName(index, val)"
            />
          </div>
          <div class="character-personality text-ellipsis" v-if="character.personality">
            {{ character.personality }}
          </div>
        </div>
        <button class="icon-btn is-danger item-delete" @click.stop="deleteCharacter(index)" title="删除">
          <AppIcon name="trash" :size="13" />
        </button>
      </div>
    </div>

    <div v-else class="empty-state">
      <AppIcon name="users" :size="26" class="empty-icon" />
      <p>暂无人物</p>
      <p class="hint">点击"添加"创建新人物</p>
    </div>

    <!-- 人物详情 -->
    <div v-if="selectedCharacter" class="character-detail">
      <div class="detail-header">
        <span>人物详情</span>
        <span class="detail-hint">修改后自动保存到当前文件状态</span>
      </div>

      <div class="detail-form">
        <div class="form-item">
          <label>姓名</label>
          <el-input v-model="selectedCharacter.name" placeholder="人物姓名" />
        </div>

        <div class="form-item">
          <label>性格</label>
          <el-input v-model="selectedCharacter.personality" type="textarea" :rows="2" placeholder="性格特点" />
        </div>

        <div class="form-item">
          <label>外貌</label>
          <el-input v-model="selectedCharacter.appearance" type="textarea" :rows="2" placeholder="外貌特征" />
        </div>

        <div class="form-item">
          <label>出场年龄</label>
          <el-input v-model="selectedCharacter.ageOfAppearance" placeholder="如：17 岁" />
        </div>

        <div class="form-item">
          <label>详细描述</label>
          <el-input v-model="selectedCharacter.content" type="textarea" :rows="4" placeholder="人物背景、经历、目标..." />
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
  novelStore.moveCharacter(from, to)
})

// 选中的人物
const selectedCharacter = computed(() => {
  if (selectedIndex.value === null) return null
  return novelStore.characters[selectedIndex.value] || null
})

// 头像底色（按索引循环取色）
const AVATAR_COLORS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #f59e0b, #f97316)',
  'linear-gradient(135deg, #10b981, #14b8a6)',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
  'linear-gradient(135deg, #8b5cf6, #d946ef)'
]

const avatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length]

// 选择人物
const selectCharacter = (index: number) => {
  selectedIndex.value = index
}

// 添加人物
const addCharacter = () => {
  novelStore.addCharacter()
  selectedIndex.value = novelStore.characters.length - 1
}

// 删除人物
const deleteCharacter = async (index: number) => {
  const name = novelStore.characters[index]?.name || '该人物'
  const ok = await confirmAction(`确定删除人物「${name}」吗？`, '删除人物')
  if (ok) {
    novelStore.deleteCharacter(index)
    if (selectedIndex.value === index) {
      selectedIndex.value = null
    } else if (selectedIndex.value !== null && selectedIndex.value > index) {
      selectedIndex.value--
    }
  }
}

// 更新人物名称（走 store action，自动触发 markDirty）
const updateCharacterName = (index: number, name: string) => {
  novelStore.updateCharacter(index, { name })
}

// 监听表单字段变化，通过 store action 触发脏标记
// （v-model 直接改 store 对象不会触发 $patch，这里深度 watch 弥补）
watch(
  () => selectedCharacter.value,
  () => {
    // 任意人物字段变化时标记脏
    novelStore.markDirty()
  },
  { deep: true }
)
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.character-list {
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

.character-item {
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

  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: @radius-md;
    color: #fff;
    font-size: @font-size-md;
    font-weight: @font-weight-semibold;
    flex-shrink: 0;
    user-select: none;
  }

  .character-info {
    flex: 1;
    min-width: 0;

    .character-name {
      font-weight: @font-weight-medium;
      color: var(--text-1);
      font-size: @font-size-base;
    }

    .character-personality {
      font-size: @font-size-sm;
      color: var(--text-3);
      margin-top: 1px;
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
.character-detail {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
  overflow-y: auto;

  .detail-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: @spacing-sm @spacing-md;
    border-bottom: 1px solid var(--border);

    span:first-child {
      font-size: @font-size-base;
      font-weight: @font-weight-semibold;
      color: var(--text-1);
    }

    .detail-hint {
      font-size: @font-size-xs;
      color: var(--text-3);
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
  }
}
</style>
