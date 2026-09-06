<template>
  <div class="welcome-screen">
    <div class="welcome-inner">
      <div class="brand">
        <div class="brand-logo">
          <AppIcon name="feather" :size="30" />
        </div>
        <h1 class="brand-title">小说编辑器</h1>
        <p class="brand-slogan">专注创作 · 静心写作</p>
      </div>

      <div class="actions">
        <button class="action-card primary" @click="showNewBookDialog = true">
          <AppIcon name="file-plus" :size="22" />
          <div class="action-text">
            <strong>新建作品</strong>
            <span>从零开始，创建一本新书</span>
          </div>
        </button>
        <button class="action-card" @click="openFile">
          <AppIcon name="folder-open" :size="22" />
          <div class="action-text">
            <strong>打开文件</strong>
            <span>浏览并打开 .xstxt 作品文件</span>
          </div>
        </button>
      </div>

      <div v-if="mainStore.recentFiles.length > 0" class="recent">
        <div class="recent-header">
          <AppIcon name="history" :size="14" />
          <span>最近打开</span>
        </div>
        <div class="recent-list">
          <div
            v-for="filePath in recentFiles"
            :key="filePath"
            class="recent-item"
            @click="openRecent(filePath)"
          >
            <AppIcon name="file-text" :size="15" class="recent-icon" />
            <div class="recent-info">
              <span class="recent-name">{{ getFileName(filePath) }}</span>
              <span class="recent-path" :title="filePath">{{ getDirName(filePath) }}</span>
            </div>
            <button
              class="icon-btn is-danger recent-remove"
              title="从列表中移除"
              @click.stop="removeRecent(filePath)"
            >
              <AppIcon name="close" :size="13" />
            </button>
          </div>
        </div>
      </div>

      <div class="footer-hints">
        <span><kbd>Ctrl</kbd>+<kbd>N</kbd> 新建</span>
        <span><kbd>Ctrl</kbd>+<kbd>O</kbd> 打开</span>
        <span><kbd>Ctrl</kbd>+<kbd>S</kbd> 保存</span>
        <span><kbd>Ctrl</kbd>+<kbd>F</kbd> 搜索</span>
      </div>
    </div>

    <NewBookDialog :visible="showNewBookDialog" @update:visible="showNewBookDialog = $event" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMainStore } from '../../store'
import { useFileActions } from '../../composables'
import AppIcon from '../common/AppIcon.vue'
import NewBookDialog from '../dialog/NewBookDialog.vue'

const mainStore = useMainStore()
const { openFile, loadFile, removeRecentFile } = useFileActions()

const showNewBookDialog = ref(false)

const recentFiles = computed(() => mainStore.recentFiles.slice(0, 8))

const getFileName = (filePath: string) => {
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}

const getDirName = (filePath: string) => {
  const parts = filePath.split(/[/\\]/)
  parts.pop()
  return parts.join('\\')
}

const openRecent = (filePath: string) => {
  loadFile(filePath)
}

const removeRecent = (filePath: string) => {
  removeRecentFile(filePath)
}
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  background:
    radial-gradient(ellipse 60% 50% at 50% -10%, var(--accent-soft), transparent),
    var(--bg-base);
}

.welcome-inner {
  width: 480px;
  max-width: 90vw;
  padding: @spacing-3xl 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: @spacing-2xl;

  .brand-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 20px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    box-shadow: 0 12px 32px -8px rgba(99, 102, 241, 0.5);
    margin-bottom: @spacing-lg;
  }

  .brand-title {
    font-size: 26px;
    font-weight: @font-weight-bold;
    color: var(--text-1);
    letter-spacing: 1px;
  }

  .brand-slogan {
    margin-top: @spacing-xs;
    font-size: @font-size-base;
    color: var(--text-3);
    letter-spacing: 2px;
  }
}

.actions {
  display: flex;
  gap: @spacing-md;
  width: 100%;
  margin-bottom: @spacing-2xl;

  .action-card {
    flex: 1;
    display: flex;
    align-items: center;
    gap: @spacing-md;
    padding: @spacing-lg;
    border: 1px solid var(--border);
    border-radius: @radius-lg;
    background: var(--bg-surface);
    cursor: pointer;
    text-align: left;
    transition: all @transition-fast;

    color: var(--accent);

    .action-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;

      strong {
        font-size: @font-size-md;
        font-weight: @font-weight-semibold;
        color: var(--text-1);
      }

      span {
        font-size: @font-size-sm;
        color: var(--text-3);
      }
    }

    &:hover {
      border-color: var(--accent);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }
  }
}

.recent {
  width: 100%;

  .recent-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 @spacing-xs @spacing-sm;
    font-size: @font-size-sm;
    font-weight: @font-weight-medium;
    color: var(--text-3);
  }

  .recent-list {
    border: 1px solid var(--border);
    border-radius: @radius-lg;
    background: var(--bg-surface);
    overflow: hidden;
  }

  .recent-item {
    display: flex;
    align-items: center;
    gap: @spacing-md;
    padding: 10px @spacing-md;
    cursor: pointer;
    border-bottom: 1px solid var(--border);
    transition: background @transition-fast;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--hover);

      .recent-remove {
        opacity: 1;
      }
    }

    .recent-icon {
      color: var(--text-3);
      flex-shrink: 0;
    }

    .recent-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;

      .recent-name {
        font-size: @font-size-base;
        font-weight: @font-weight-medium;
        color: var(--text-1);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .recent-path {
        font-size: @font-size-xs;
        color: var(--text-3);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .recent-remove {
      width: 24px;
      height: 24px;
      opacity: 0;
      flex-shrink: 0;
    }
  }
}

.footer-hints {
  margin-top: @spacing-2xl;
  display: flex;
  gap: @spacing-lg;
  font-size: @font-size-sm;
  color: var(--text-3);

  kbd {
    display: inline-block;
    padding: 1px 5px;
    border: 1px solid var(--border-strong);
    border-bottom-width: 2px;
    border-radius: 4px;
    background: var(--bg-surface);
    font-family: @font-mono;
    font-size: 11px;
    color: var(--text-2);
  }
}
</style>
