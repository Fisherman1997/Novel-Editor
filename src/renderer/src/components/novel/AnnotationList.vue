<template>
  <div class="annotation-list">
    <div class="list-header">
      <span class="list-title">标注</span>
      <span class="count">{{ annotations.length }} 条</span>
    </div>

    <div class="list-content" v-if="annotations.length > 0">
      <div
        v-for="annotation in annotations"
        :key="annotation.id"
        class="annotation-item"
        :class="`type-${annotation.type}`"
        @click="handleAnnotationClick(annotation)"
      >
        <span class="type-dot" :style="dotStyle(annotation)"></span>

        <div class="annotation-info">
          <div class="annotation-header">
            <span class="type-label">{{ getTypeLabel(annotation.type) }}</span>
            <span class="chapter-name text-ellipsis">{{ getChapterName(annotation) }}</span>
          </div>

          <div class="annotation-content">
            <template v-if="annotation.type === 'highlight'">
              <span
                class="highlight-preview"
                :style="{ backgroundColor: annotation.color || '#fde68a' }"
              >
                {{ getHighlightedText(annotation) }}
              </span>
            </template>
            <template v-else-if="annotation.type === 'note'">
              {{ annotation.content || '无内容' }}
            </template>
            <template v-else-if="annotation.type === 'link'">
              {{ getLinkTarget(annotation) }}
            </template>
          </div>

          <div class="annotation-meta">
            <AppIcon name="clock" :size="11" />
            {{ formatTime(annotation.createdAt) }}
          </div>
        </div>

        <div class="row-actions">
          <el-tooltip content="编辑" placement="top" :show-after="400">
            <button class="icon-btn" @click.stop="editAnnotation(annotation)">
              <AppIcon name="pencil" :size="13" />
            </button>
          </el-tooltip>
          <el-tooltip content="删除" placement="top" :show-after="400">
            <button class="icon-btn is-danger" @click.stop="deleteAnnotation(annotation)">
              <AppIcon name="trash" :size="13" />
            </button>
          </el-tooltip>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <AppIcon name="message-square" :size="26" class="empty-icon" />
      <p>暂无标注</p>
      <p class="hint">在编辑器中选中文本，点击工具栏"标注"按钮</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMainStore, useNovelStore } from '../../store'
import { useAnnotation } from '../../composables'
import { Annotation } from '@shared/types'
import { getAnnotatedTextFromHtml } from '../../utils/htmlText'
import AppIcon from '../common/AppIcon.vue'
import { confirmAction } from '../../utils/confirm'

const mainStore = useMainStore()
const novelStore = useNovelStore()
const { openEdit, removeAnnotation } = useAnnotation()

type AnnotationWithPos = Annotation & { volumeIndex: number; chapterIndex: number }

// 使用 novel store 的 allAnnotations getter（按时间倒序）
const annotations = computed(() => {
  return [...novelStore.allAnnotations].sort((a, b) => b.createdAt - a.createdAt)
})

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = { highlight: '高亮', note: '备注', link: '链接' }
  return labels[type] || type
}

const dotStyle = (annotation: AnnotationWithPos) => {
  if (annotation.type === 'highlight') {
    return { background: annotation.color || '#fde68a' }
  }
  if (annotation.type === 'note') {
    return { background: 'var(--accent)' }
  }
  return { background: 'var(--success)' }
}

const getChapterName = (annotation: AnnotationWithPos): string => {
  const volume = novelStore.volumes[annotation.volumeIndex]
  const chapter = volume?.chapters[annotation.chapterIndex]
  return chapter?.chapterName || '未知章节'
}

const getHighlightedText = (annotation: AnnotationWithPos): string => {
  return getAnnotatedTextFromHtml(
    novelStore.volumes[annotation.volumeIndex]?.chapters[annotation.chapterIndex]?.content || '',
    annotation.id
  )
}

const getLinkTarget = (annotation: AnnotationWithPos): string => {
  if (annotation.linkedCharacterId) {
    const character = novelStore.characters.find(c => c.id === annotation.linkedCharacterId)
    return `人物 · ${character?.name || '未知'}`
  }
  if (annotation.linkedChapter) {
    const { volumeIndex, chapterIndex } = annotation.linkedChapter
    const chapter = novelStore.volumes[volumeIndex]?.chapters[chapterIndex]
    return `章节 · ${chapter?.chapterName || '未知'}`
  }
  return annotation.content || '无链接'
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleAnnotationClick = (annotation: AnnotationWithPos) => {
  mainStore.selectChapter(annotation.volumeIndex, annotation.chapterIndex)
}

const editAnnotation = (annotation: AnnotationWithPos) => {
  openEdit(annotation.volumeIndex, annotation.chapterIndex, annotation.id)
}

const deleteAnnotation = async (annotation: AnnotationWithPos) => {
  const ok = await confirmAction('确定要删除这条标注吗？', '删除标注')
  if (ok) {
    mainStore.selectChapter(annotation.volumeIndex, annotation.chapterIndex)
    removeAnnotation(annotation.id)
  }
}
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.annotation-list {
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

  .count {
    font-size: @font-size-sm;
    color: var(--text-3);
  }
}

.list-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 @spacing-sm @spacing-sm;
}

.annotation-item {
  display: flex;
  align-items: flex-start;
  gap: @spacing-md;
  padding: @spacing-md @spacing-sm;
  border-radius: @radius-md;
  cursor: pointer;
  transition: background @transition-fast;

  &:hover {
    background: var(--hover);

    .row-actions {
      opacity: 1;
    }
  }

  .type-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 5px;
    flex-shrink: 0;
  }

  .annotation-info {
    flex: 1;
    min-width: 0;

    .annotation-header {
      display: flex;
      align-items: center;
      gap: @spacing-sm;
      margin-bottom: 3px;
      min-width: 0;

      .type-label {
        font-size: @font-size-sm;
        font-weight: @font-weight-semibold;
        color: var(--text-1);
        flex-shrink: 0;
      }

      .chapter-name {
        font-size: @font-size-sm;
        color: var(--text-3);
      }
    }

    .annotation-content {
      font-size: @font-size-base;
      color: var(--text-2);
      line-height: @line-height-tight;
      word-break: break-word;

      .highlight-preview {
        padding: 1px 5px;
        border-radius: @radius-sm;
        color: var(--text-1);
      }
    }

    .annotation-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      font-size: @font-size-xs;
      color: var(--text-3);
    }
  }

  .row-actions {
    display: flex;
    gap: 1px;
    opacity: 0;
    transition: opacity @transition-fast;

    .icon-btn {
      width: 24px;
      height: 24px;
    }
  }
}
</style>
