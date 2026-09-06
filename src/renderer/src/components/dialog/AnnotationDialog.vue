<template>
  <el-dialog
    :model-value="dialogOpen"
    :title="dialogMode === 'create' ? '添加标注' : '编辑标注'"
    width="440px"
    :close-on-click-modal="false"
    @close="closeDialog"
  >
    <div class="annotation-dialog">
      <!-- 选中文本预览（仅创建模式） -->
      <div class="selected-text" v-if="dialogMode === 'create' && createSelection">
        <label>选中文本</label>
        <div class="text-preview">{{ createSelection.text }}</div>
      </div>

      <!-- 编辑：当前标注文本 -->
      <div class="selected-text" v-if="dialogMode === 'edit' && editingAnnotation">
        <label>标注文本</label>
        <div class="text-preview">
          {{ getAnnotationText() }}
        </div>
      </div>

      <!-- 标注类型（仅创建模式可切换） -->
      <div class="annotation-type">
        <label>类型</label>
        <el-radio-group v-model="annotationType" :disabled="dialogMode === 'edit'" size="small">
          <el-radio-button label="highlight">高亮</el-radio-button>
          <el-radio-button label="note">备注</el-radio-button>
          <el-radio-button label="link">链接</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 高亮颜色 -->
      <div v-if="annotationType === 'highlight'" class="color-picker">
        <label>颜色</label>
        <div class="color-options">
          <div
            v-for="color in highlightColors"
            :key="color.value"
            class="color-option"
            :class="{ 'is-selected': highlightColor === color.value }"
            :style="{ backgroundColor: color.value }"
            @click="highlightColor = color.value"
          >
            <AppIcon v-if="highlightColor === color.value" name="check" :size="14" />
          </div>
        </div>
      </div>

      <!-- 标注内容 -->
      <div class="annotation-content">
        <label>{{ annotationType === 'link' ? '链接地址' : '备注内容' }}</label>
        <el-input
          v-if="annotationType === 'link'"
          v-model="annotationContent"
          placeholder="输入链接地址 (URL) 或选择链接目标"
        />
        <el-input
          v-else
          v-model="annotationContent"
          type="textarea"
          :rows="3"
          placeholder="输入备注内容..."
        />
      </div>

      <!-- 链接目标 -->
      <div v-if="annotationType === 'link'" class="link-target">
        <label>或选择链接目标</label>
        <el-tabs v-model="linkTargetType">
          <el-tab-pane label="人物" name="character">
            <el-select v-model="selectedCharacterId" placeholder="选择人物" style="width: 100%">
              <el-option
                v-for="character in characters"
                :key="character.id"
                :label="character.name"
                :value="character.id"
              />
            </el-select>
          </el-tab-pane>
          <el-tab-pane label="章节" name="chapter">
            <div class="chapter-selector">
              <el-select
                v-model="selectedVolumeIndex"
                placeholder="选择卷"
                style="width: 45%"
                @change="selectedChapterIndex = 0"
              >
                <el-option
                  v-for="(volume, index) in volumes"
                  :key="index"
                  :label="volume.volumeName"
                  :value="index"
                />
              </el-select>
              <el-select
                v-model="selectedChapterIndex"
                placeholder="选择章节"
                style="width: 55%"
              >
                <el-option
                  v-for="(chapter, index) in currentVolumeChapters"
                  :key="index"
                  :label="chapter.chapterName"
                  :value="index"
                />
              </el-select>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button v-if="dialogMode === 'edit'" type="danger" plain @click="handleDelete">
          删除标注
        </el-button>
        <el-button type="primary" :disabled="!canConfirm" @click="handleConfirm">
          {{ dialogMode === 'create' ? '添加' : '保存' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNovelStore, useEditorStore } from '../../store'
import { useAnnotation } from '../../composables'
import { AnnotationType } from '@shared/types'
import { getAnnotatedTextFromHtml } from '../../utils/htmlText'
import { showSuccess } from '../../utils/errorHandler'
import { confirmAction } from '../../utils/confirm'
import AppIcon from '../common/AppIcon.vue'

const novelStore = useNovelStore()
const editorStore = useEditorStore()
const {
  dialogOpen, dialogMode, createSelection, editingAnnotation,
  addAnnotation, updateAnnotation, removeAnnotation, updateColor,
  linkToCharacter, linkToChapter, closeDialog
} = useAnnotation()

const annotationType = ref<AnnotationType>('highlight')
const annotationContent = ref('')
const highlightColor = ref('#fde68a')
const linkTargetType = ref('character')
const selectedCharacterId = ref('')
const selectedVolumeIndex = ref(0)
const selectedChapterIndex = ref(0)

const highlightColors = [
  { name: '琥珀', value: '#fde68a' },
  { name: '薄荷', value: '#a7f3d0' },
  { name: '天空', value: '#bae6fd' },
  { name: '丁香', value: '#ddd6fe' },
  { name: '玫瑰', value: '#fecdd3' },
  { name: '芒果', value: '#fed7aa' }
]

const characters = computed(() => novelStore.characters)
const volumes = computed(() => novelStore.volumes)
const currentVolumeChapters = computed(() =>
  volumes.value[selectedVolumeIndex.value]?.chapters || []
)

// 编辑时获取标注对应的文本
const getAnnotationText = (): string => {
  const ann = editingAnnotation.value
  if (!ann) return ''
  const target = editorStore.annotationDialog.editTarget
  if (!target) return ''
  return getAnnotatedTextFromHtml(
    novelStore.volumes[target.volumeIndex]?.chapters[target.chapterIndex]?.content || '',
    ann.id
  )
}

// 打开对话框时填充当前值
watch(dialogOpen, (open) => {
  if (!open) return

  if (dialogMode.value === 'edit' && editingAnnotation.value) {
    const ann = editingAnnotation.value
    annotationType.value = ann.type
    annotationContent.value = ann.content || ''
    highlightColor.value = ann.color || '#fde68a'
    selectedCharacterId.value = ann.linkedCharacterId || ''
    selectedVolumeIndex.value = ann.linkedChapter?.volumeIndex ?? 0
    selectedChapterIndex.value = ann.linkedChapter?.chapterIndex ?? 0
  } else {
    // 创建模式：重置
    annotationType.value = 'highlight'
    annotationContent.value = ''
    highlightColor.value = '#fde68a'
    selectedCharacterId.value = ''
    selectedVolumeIndex.value = 0
    selectedChapterIndex.value = 0
  }
})

const canConfirm = computed(() => {
  if (dialogMode.value === 'create' && !createSelection.value) return false
  if (annotationType.value === 'highlight') return true
  if (annotationType.value === 'note') return annotationContent.value.trim().length > 0
  if (annotationType.value === 'link') {
    return annotationContent.value.trim().length > 0 || !!selectedCharacterId.value || selectedChapterIndex.value !== undefined
  }
  return false
})

const handleConfirm = () => {
  if (dialogMode.value === 'create') {
    // 创建标注
    const ann = addAnnotation(annotationType.value, annotationContent.value, highlightColor.value)
    if (ann) {
      // 链接目标
      if (annotationType.value === 'link') {
        if (selectedCharacterId.value) {
          linkToCharacter(ann.id, selectedCharacterId.value)
        } else if (selectedChapterIndex.value !== undefined) {
          linkToChapter(ann.id, selectedVolumeIndex.value, selectedChapterIndex.value)
        }
      }
      showSuccess('标注已添加')
    }
  } else {
    // 编辑标注
    const target = editingAnnotation.value
    if (!target) return
    updateAnnotation(target.id, { content: annotationContent.value })
    if (annotationType.value === 'highlight') {
      updateColor(target.id, highlightColor.value)
    }
    if (annotationType.value === 'link') {
      if (selectedCharacterId.value) {
        linkToCharacter(target.id, selectedCharacterId.value)
      } else if (selectedChapterIndex.value !== undefined) {
        linkToChapter(target.id, selectedVolumeIndex.value, selectedChapterIndex.value)
      }
    }
    showSuccess('标注已更新')
  }
  closeDialog()
}

const handleDelete = async () => {
  const target = editingAnnotation.value
  if (!target) return
  const ok = await confirmAction('确定要删除这条标注吗？', '删除标注')
  if (ok) {
    removeAnnotation(target.id)
    showSuccess('标注已删除')
    closeDialog()
  }
}

watch(annotationType, () => {
  annotationContent.value = ''
  selectedCharacterId.value = ''
  selectedVolumeIndex.value = 0
  selectedChapterIndex.value = 0
})
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.annotation-dialog {
  display: flex;
  flex-direction: column;
  gap: @spacing-lg;
}

.selected-text {
  label {
    display: block;
    font-weight: @font-weight-medium;
    margin-bottom: @spacing-sm;
    color: var(--text-1);
  }

  .text-preview {
    padding: @spacing-md;
    background: var(--bg-inset);
    border-radius: @radius-md;
    font-style: italic;
    color: var(--text-2);
    max-height: 80px;
    overflow-y: auto;
    border: 1px solid var(--border);
  }
}

.annotation-type {
  label {
    display: block;
    font-weight: @font-weight-medium;
    margin-bottom: @spacing-sm;
    color: var(--text-1);
  }
}

.color-picker {
  label {
    display: block;
    font-weight: @font-weight-medium;
    margin-bottom: @spacing-sm;
    color: var(--text-1);
  }

  .color-options {
    display: flex;
    gap: @spacing-sm;

    .color-option {
      width: 32px;
      height: 32px;
      border-radius: @radius-full;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid transparent;
      transition: all @transition-fast;

      &:hover { transform: scale(1.1); }

      &.is-selected {
        border-color: var(--text-1);
        box-shadow: 0 0 0 2px var(--bg-surface), 0 0 0 4px var(--text-1);
      }

      :deep(.app-icon) {
        color: #374151;
      }
    }
  }
}

.annotation-content {
  label {
    display: block;
    font-weight: @font-weight-medium;
    margin-bottom: @spacing-sm;
    color: var(--text-1);
  }

  :deep(.el-textarea) { resize: none; }
}

.link-target {
  label {
    display: block;
    font-weight: @font-weight-medium;
    margin-bottom: @spacing-sm;
    color: var(--text-1);
  }

  .chapter-selector {
    display: flex;
    gap: @spacing-sm;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: @spacing-sm;
}
</style>
