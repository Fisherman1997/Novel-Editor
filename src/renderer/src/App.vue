<template>
    <div class="app">
        <AppHeader />

        <WelcomeScreen v-if="!mainStore.isFileLoaded" class="welcome-wrapper" />

        <div v-else class="main">
            <transition name="panel-left">
                <AppLeftNav v-show="!isLeftCollapsed" />
            </transition>
            <div class="content-area">
                <TiptapEditor />
            </div>
            <transition name="panel-right">
                <AppRight v-show="!isRightCollapsed" />
            </transition>
        </div>

        <!-- 全局对话框 -->
        <SearchDialog />
        <SettingsDialog v-if="showSettings" @close="showSettings = false" />
        <ExportDialog v-if="showExport" @close="showExport = false" />
        <AnnotationDialog />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useMainStore } from './store'
import { useAutoSave, usePanelCollapse, useFileActions } from './composables'
import AppHeader from './components/layout/AppHeader.vue'
import AppLeftNav from './components/layout/AppLeftNav.vue'
import AppRight from './components/layout/AppRight.vue'
import TiptapEditor from './components/editor/TiptapEditor.vue'
import WelcomeScreen from './components/common/WelcomeScreen.vue'
import SearchDialog from './components/dialog/SearchDialog.vue'
import SettingsDialog from './components/dialog/SettingsDialog.vue'
import ExportDialog from './components/dialog/ExportDialog.vue'
import AnnotationDialog from './components/dialog/AnnotationDialog.vue'

const mainStore = useMainStore()
useAutoSave()
const {
    isLeftCollapsed,
    isRightCollapsed,
    toggleLeftPanel,
    toggleRightPanel,
    toggleFullscreen,
    exitFullscreen
} = usePanelCollapse()
const { openFile, saveFile, loadStartupOrRecentFile, loadFile } = useFileActions()

const showSettings = ref(false)
const showExport = ref(false)

// ---------- 主题 ----------
const applyTheme = (theme: string) => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
}

watch(() => mainStore.theme, applyTheme, { immediate: true })

// ---------- 全局快捷键 ----------
const handleKeyDown = (event: KeyboardEvent) => {
    // Ctrl+S: 保存
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault()
        saveFile()
    }

    // Ctrl+N: 新建（欢迎页与侧栏各自监听）
    if (event.ctrlKey && event.key === 'n') {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('app-new-file'))
    }

    // Ctrl+O: 打开
    if (event.ctrlKey && event.key === 'o') {
        event.preventDefault()
        openFile()
    }

    // Ctrl+E: 导出
    if (event.ctrlKey && event.key === 'e' && !event.shiftKey) {
        event.preventDefault()
        showExport.value = true
    }

    // Ctrl+\: 切换左侧导航
    if (event.ctrlKey && event.key === '\\') {
        event.preventDefault()
        toggleLeftPanel()
    }

    // Ctrl+Shift+H: 切换右侧面板
    if (event.ctrlKey && event.shiftKey && event.key === 'H') {
        event.preventDefault()
        toggleRightPanel()
    }

    // Ctrl+Shift+E: 沉浸模式（隐藏两侧面板）
    if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault()
        toggleFullscreen()
    }

    // Escape: 退出沉浸模式
    if (event.key === 'Escape') {
        exitFullscreen()
    }
}

// ---------- 窗口关闭前处理 ----------
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (mainStore.isDirty) {
        event.preventDefault()
        event.returnValue = ''
    }
}

const openSettings = () => {
    showSettings.value = true
}

const openExportEvent = () => {
    showExport.value = true
}

// ---------- 生命周期 ----------
let offFileOpen: (() => void) | null = null

onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('open-settings', openSettings)
    window.addEventListener('open-export', openExportEvent)

    // 双击 .xstxt 文件（文件关联）启动或运行中打开时，主进程会通知
    offFileOpen = window.api.onFileOpen((filePath) => {
        loadFile(filePath)
    })

    loadStartupOrRecentFile()
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('open-settings', openSettings)
    window.removeEventListener('open-export', openExportEvent)
    offFileOpen?.()
})
</script>

<style lang="less">
@import './styles/variables.less';

.app {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: var(--bg-base);
}

.welcome-wrapper {
    flex: 1;
    min-height: 0;
}

.main {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    background: var(--bg-base);
}

// 面板折叠过渡动画
.panel-left-enter-active,
.panel-left-leave-active {
    transition:
        margin-left @transition-slow,
        opacity @transition-slow;
}

.panel-left-enter-from,
.panel-left-leave-to {
    margin-left: -@sidebar-left-width;
    opacity: 0;
}

.panel-right-enter-active,
.panel-right-leave-active {
    transition:
        margin-right @transition-slow,
        opacity @transition-slow;
}

.panel-right-enter-from,
.panel-right-leave-to {
    margin-right: -@sidebar-right-width;
    opacity: 0;
}
</style>
