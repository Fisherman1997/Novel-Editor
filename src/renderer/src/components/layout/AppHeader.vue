<template>
    <div class="app-header" @dblclick="windowControl('maximize')">
        <div class="header-left">
            <div class="logo-mark">
                <AppIcon name="feather" :size="14" />
            </div>
            <span class="app-title">小说编辑器</span>
        </div>

        <div class="header-center">
            <template v-if="mainStore.isFileLoaded">
                <span class="file-name" :title="mainStore.currentFilePath || ''">
                    {{ mainStore.currentFileName }}
                </span>
                <button
                    class="save-chip"
                    :class="{ 'is-dirty': mainStore.isDirty }"
                    :title="mainStore.isDirty ? '点击保存 (Ctrl+S)' : '更改已保存'"
                    @click="saveNow"
                >
                    <span class="chip-dot"></span>
                    {{ mainStore.isDirty ? '未保存' : '已保存' }}
                </button>
            </template>
        </div>

        <div class="header-right">
            <el-tooltip content="切换主题" placement="bottom" :show-after="400">
                <button class="header-btn" @click="mainStore.toggleTheme()">
                    <AppIcon :name="mainStore.theme === 'dark' ? 'sun' : 'moon'" :size="15" />
                </button>
            </el-tooltip>

            <el-tooltip content="设置" placement="bottom" :show-after="400">
                <button class="header-btn" @click="openSettings">
                    <AppIcon name="settings" :size="15" />
                </button>
            </el-tooltip>

            <el-tooltip content="导出小说 (Ctrl+E)" placement="bottom" :show-after="400">
                <button class="header-btn" @click="openExport">
                    <AppIcon name="share" :size="15" />
                </button>
            </el-tooltip>

            <div class="header-divider"></div>

            <button class="header-btn" title="最小化" @click="windowControl('minimize')">
                <AppIcon name="minus" :size="15" />
            </button>
            <button
                class="header-btn"
                :title="isMaximized ? '向下还原' : '最大化'"
                @click="windowControl('maximize')"
            >
                <AppIcon :name="isMaximized ? 'restore' : 'square'" :size="13" />
            </button>
            <button class="header-btn close-btn" title="关闭" @click="handleClose">
                <AppIcon name="close" :size="15" />
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useMainStore } from '../../store'
import { useFileActions } from '../../composables'
import AppIcon from '../common/AppIcon.vue'

const mainStore = useMainStore()
const { confirmCloseWithSave } = useFileActions()

// 通过窗口尺寸推断最大化状态（主进程未推送该事件）
const isMaximized = ref(false)
const detectMaximized = () => {
    isMaximized.value =
        window.innerWidth >= screen.availWidth - 8 && window.innerHeight >= screen.availHeight - 8
}

const windowControl = (action: 'minimize' | 'maximize' | 'close') => {
    window.api.windowControl(action)
}

const openSettings = () => {
    window.dispatchEvent(new Event('open-settings'))
}

const openExport = () => {
    window.dispatchEvent(new Event('open-export'))
}

const saveNow = () => {
    if (mainStore.isDirty) {
        window.dispatchEvent(new CustomEvent('editor-save'))
    }
}

const handleClose = async () => {
    if (await confirmCloseWithSave()) {
        windowControl('close')
    }
}

onMounted(() => {
    detectMaximized()
    window.addEventListener('resize', detectMaximized)
})

onUnmounted(() => {
    window.removeEventListener('resize', detectMaximized)
})
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: @header-height;
    padding: 0 8px 0 @spacing-lg;
    background: var(--bg-subtle);
    border-bottom: 1px solid var(--border);
    -webkit-app-region: drag;
    user-select: none;
}

.header-left {
    display: flex;
    align-items: center;
    gap: @spacing-sm;
    min-width: 220px;

    .logo-mark {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 7px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #fff;
        box-shadow: var(--shadow-sm);
    }

    .app-title {
        font-size: @font-size-base;
        font-weight: @font-weight-semibold;
        color: var(--text-1);
        letter-spacing: 0.3px;
    }
}

.header-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: @spacing-md;
    min-width: 0;

    .file-name {
        font-size: @font-size-base;
        color: var(--text-2);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .save-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        border: 1px solid var(--border);
        border-radius: @radius-full;
        background: var(--bg-surface);
        color: var(--text-3);
        font-size: @font-size-sm;
        cursor: default;
        flex-shrink: 0;
        transition: all @transition-fast;

        .chip-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--success);
        }

        &.is-dirty {
            color: var(--warning);
            border-color: var(--border-strong);
            cursor: pointer;

            .chip-dot {
                background: var(--warning);
            }

            &:hover {
                border-color: var(--warning);
                background: var(--bg-surface);
            }
        }
    }
}

.header-right {
    display: flex;
    align-items: center;
    gap: 2px;
    -webkit-app-region: no-drag;

    .header-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 30px;
        border: none;
        background: transparent;
        color: var(--text-2);
        cursor: pointer;
        border-radius: @radius-md;
        transition:
            background @transition-fast,
            color @transition-fast;

        &:hover {
            background: var(--hover);
            color: var(--text-1);
        }
    }

    .close-btn:hover {
        background: var(--danger);
        color: #fff;
    }
}

.header-divider {
    width: 1px;
    height: 18px;
    background: var(--border-strong);
    margin: 0 6px 0 8px;
}
</style>
