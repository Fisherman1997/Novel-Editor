<template>
  <div class="editor-toolbar">
    <!-- 撤销/重做 -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        :disabled="!editor?.can().undo()"
        title="撤销 (Ctrl+Z)"
        @click="editor?.chain().focus().undo().run()"
      >
        <AppIcon name="undo-2" :size="16" />
      </button>
      <button
        class="toolbar-btn"
        :disabled="!editor?.can().redo()"
        title="重做 (Ctrl+Y)"
        @click="editor?.chain().focus().redo().run()"
      >
        <AppIcon name="redo-2" :size="16" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 标题 -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn text-btn"
        :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }"
        title="标题 1"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        H1
      </button>
      <button
        class="toolbar-btn text-btn"
        :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
        title="标题 2"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        class="toolbar-btn text-btn"
        :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
        title="标题 3"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 基础格式 -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('bold') }"
        title="加粗 (Ctrl+B)"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <AppIcon name="bold" :size="15" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('italic') }"
        title="斜体 (Ctrl+I)"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <AppIcon name="italic" :size="15" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('underline') }"
        title="下划线 (Ctrl+U)"
        @click="editor?.chain().focus().toggleUnderline().run()"
      >
        <AppIcon name="underline" :size="15" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('strike') }"
        title="删除线"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <AppIcon name="strikethrough" :size="15" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 列表 -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('bulletList') }"
        title="无序列表"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <AppIcon name="list" :size="15" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('orderedList') }"
        title="有序列表"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <AppIcon name="list-ordered" :size="15" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('taskList') }"
        title="任务列表"
        @click="editor?.chain().focus().toggleTaskList().run()"
      >
        <AppIcon name="list-todo" :size="15" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 引用和代码 -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('blockquote') }"
        title="引用"
        @click="editor?.chain().focus().toggleBlockquote().run()"
      >
        <AppIcon name="quote" :size="15" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('codeBlock') }"
        title="代码块"
        @click="editor?.chain().focus().toggleCodeBlock().run()"
      >
        <AppIcon name="code" :size="15" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('code') }"
        title="行内代码"
        @click="editor?.chain().focus().toggleCode().run()"
      >
        <AppIcon name="braces" :size="15" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 链接、高亮、标注 -->
    <div class="toolbar-group">
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('link') }"
        title="插入链接"
        @click="setLink"
      >
        <AppIcon name="link" :size="15" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('highlight') }"
        title="高亮"
        @click="editor?.chain().focus().toggleHighlight().run()"
      >
        <AppIcon name="highlighter" :size="15" />
      </button>
      <button
        class="toolbar-btn annotation-btn"
        title="标注选中文本"
        @click="$emit('toggle-annotation-mode')"
      >
        <AppIcon name="message-square-plus" :size="15" />
        标注
      </button>
    </div>

    <!-- 右侧：搜索 -->
    <div class="toolbar-group toolbar-right">
      <button class="toolbar-btn" title="搜索和替换 (Ctrl+F)" @click="openSearch">
        <AppIcon name="search" :size="15" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Editor } from '@tiptap/vue-3'
import { useEditorStore } from '../../store'
import { promptInput } from '../../utils/confirm'
import AppIcon from '../common/AppIcon.vue'

interface Props {
  editor: Editor | null
  showAnnotationTools?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAnnotationTools: false
})

defineEmits<{
  (e: 'toggle-annotation-mode'): void
}>()

const editorStore = useEditorStore()

// 设置链接（替代原生 prompt）
const setLink = async () => {
  if (!props.editor) return

  const previousUrl = props.editor.getAttributes('link').href || ''
  const url = await promptInput('输入链接地址（留空则移除链接）', '插入链接', previousUrl, {
    placeholder: 'https://...'
  })

  if (url === null) return // 用户取消

  if (url.trim() === '') {
    props.editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }

  props.editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url.trim() })
    .run()
}

// 打开搜索
const openSearch = () => {
  editorStore.openSearch()
}
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.editor-toolbar {
  display: flex;
  align-items: center;
  padding: 6px @spacing-md;
  border-bottom: 1px solid var(--border);
  background: var(--bg-subtle);
  flex-wrap: wrap;
  gap: 2px;
  flex-shrink: 0;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 1px;

  &.toolbar-right {
    margin-left: auto;
  }
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: var(--border-strong);
  margin: 0 7px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border: none;
  background: transparent;
  border-radius: @radius-md;
  cursor: pointer;
  font-size: @font-size-sm;
  font-weight: @font-weight-medium;
  color: var(--text-2);
  transition: all @transition-fast;

  &:hover:not(:disabled) {
    background: var(--hover);
    color: var(--text-1);
  }

  &.is-active {
    background: var(--accent-soft);
    color: var(--accent);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &.text-btn {
    font-size: @font-size-sm;
    font-weight: @font-weight-bold;
    font-family: @font-mono;
  }

  &.annotation-btn {
    color: var(--text-2);

    &:hover {
      color: var(--accent);
      background: var(--accent-soft);
    }
  }
}
</style>
