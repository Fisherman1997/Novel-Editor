<template>
    <el-dialog v-model="visible" title="设置" width="520px" @close="handleClose">
        <div class="settings-dialog">
            <!-- 写作外观 -->
            <div class="settings-section">
                <div class="section-title">
                    <span>写作外观</span>
                    <span class="section-hint">在预设调色板和自定义输入之间切换</span>
                </div>

                <div class="palette-row">
                    <button
                        v-for="preset in PALETTES"
                        :key="preset.name"
                        class="palette-chip"
                        :class="{ 'is-active': preset.applies(localSettings) }"
                        :style="preset.style"
                        @click="preset.apply(localSettings)"
                    >
                        <span class="chip-name">{{ preset.name }}</span>
                    </button>
                </div>

                <div class="form-grid">
                    <div class="form-item">
                        <label>字体</label>
                        <el-select v-model="localSettings.fontFamily" style="width: 100%">
                            <el-option
                                v-for="option in FONT_FAMILY_OPTIONS"
                                :key="option.value"
                                :label="option.label"
                                :value="option.value"
                            />
                        </el-select>
                    </div>

                    <div class="form-item">
                        <label>字号 {{ localSettings.fontSize }}px</label>
                        <el-slider v-model="localSettings.fontSize" :min="13" :max="26" :step="1" />
                    </div>

                    <div class="form-item">
                        <label>行高 {{ localSettings.lineHeight }}px</label>
                        <el-slider
                            v-model="localSettings.lineHeight"
                            :min="22"
                            :max="42"
                            :step="1"
                        />
                    </div>

                    <div class="form-item">
                        <label>文字颜色</label>
                        <el-input
                            v-model="localSettings.fontColor"
                            placeholder="#1f2328"
                            maxlength="7"
                        />
                    </div>

                    <div class="form-item">
                        <label>背景颜色</label>
                        <el-input
                            v-model="localSettings.backgroundColor"
                            placeholder="#ffffff"
                            maxlength="7"
                        />
                    </div>

                    <div class="form-item">
                        <label>右侧面板宽度 {{ localSettings.rightPanelWidth }}px</label>
                        <el-slider
                            v-model="localSettings.rightPanelWidth"
                            :min="220"
                            :max="480"
                            :step="10"
                        />
                    </div>
                </div>
            </div>

            <!-- 自动保存 -->
            <div class="settings-section">
                <div class="section-title">
                    <span>自动保存</span>
                </div>

                <div class="form-grid form-grid-2">
                    <div class="form-item">
                        <el-switch v-model="localAutoSave.enabled" active-text="启用自动保存" />
                    </div>
                    <div v-if="localAutoSave.enabled" class="form-item">
                        <label>保存间隔 {{ localAutoSaveInterval }} 秒</label>
                        <el-slider
                            v-model="localAutoSaveInterval"
                            :min="10"
                            :max="300"
                            :step="10"
                        />
                    </div>
                    <div v-if="localAutoSave.enabled" class="form-item">
                        <label
                            >编辑后静默保存延迟
                            {{ Math.round(localAutoSave.delay / 1000) }} 秒</label
                        >
                        <el-slider v-model="debounceSec" :min="2" :max="30" :step="1" />
                    </div>
                </div>
            </div>

            <!-- 数据管理 -->
            <div class="settings-section">
                <div class="section-title">
                    <span>数据管理</span>
                </div>
                <div class="data-management">
                    <button class="danger-action" @click="clearCache">清除所有本地缓存</button>
                    <span class="danger-hint">清除后将重置所有设置并重新加载应用</span>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <el-button plain @click="resetDefaults">恢复默认</el-button>
                <el-button @click="handleClose">取消</el-button>
                <el-button type="primary" @click="saveSettings">保存</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMainStore } from '../../store'
import { EditorConfig, AutoSaveConfig } from '@shared/types'
import { confirmAction } from '../../utils/confirm'
import { FONT_FAMILY_OPTIONS } from '../../utils/fonts'

const mainStore = useMainStore()

const visible = ref(true)

// 本地设置副本
const localSettings = ref<EditorConfig>({ ...mainStore.editor })
const localAutoSave = ref<AutoSaveConfig>({ ...mainStore.autoSave })

// 预设调色板（小而聚焦、写作相关）
const PALETTES = [
    {
        name: '纸',
        style: { background: '#ffffff', color: '#1f2328', border: '1px solid #d3d8e0' },
        applies: (s: EditorConfig) => s.backgroundColor === '#ffffff' && s.fontColor === '#1f2328',
        apply: (s: EditorConfig) => {
            s.backgroundColor = '#ffffff'
            s.fontColor = '#1f2328'
        }
    },
    {
        name: '暖光',
        style: { background: '#faf7f2', color: '#2e2a27', border: '1px solid #e3ddd5' },
        applies: (s: EditorConfig) => s.backgroundColor === '#faf7f2',
        apply: (s: EditorConfig) => {
            s.backgroundColor = '#faf7f2'
            s.fontColor = '#2e2a27'
        }
    },
    {
        name: '夜读',
        style: { background: '#1b1f2b', color: '#e7eaf0', border: '1px solid #323749' },
        applies: (s: EditorConfig) => s.backgroundColor === '#1b1f2b',
        apply: (s: EditorConfig) => {
            s.backgroundColor = '#1b1f2b'
            s.fontColor = '#e7eaf0'
        }
    }
]

// 自动保存间隔（秒）
const localAutoSaveInterval = computed({
    get: () => Math.round(localAutoSave.value.interval / 1000),
    set: (val: number) => {
        localAutoSave.value.interval = val * 1000
    }
})

const debounceSec = computed({
    get: () => Math.round(localAutoSave.value.delay / 1000),
    set: (val: number) => {
        localAutoSave.value.delay = val * 1000
    }
})

const emit = defineEmits<{
    (e: 'close'): void
}>()

// 默认设置
const defaultSettings: EditorConfig = {
    fontSize: 17,
    fontFamily: '默认',
    fontColor: '#1f2328',
    backgroundColor: '#ffffff',
    lineHeight: 30,
    rightPanelWidth: 320
}

const defaultAutoSave: AutoSaveConfig = {
    enabled: true,
    interval: 30000,
    delay: 5000
}

// 保存设置
const saveSettings = () => {
    mainStore.updateEditorConfig(localSettings.value)
    mainStore.updateAutoSaveConfig(localAutoSave.value)
    handleClose()
}

// 恢复默认设置
const resetDefaults = () => {
    localSettings.value = { ...defaultSettings }
    localAutoSave.value = { ...defaultAutoSave }
}

// 清除缓存
const clearCache = async () => {
    const ok = await confirmAction(
        '确定要清除所有本地缓存吗？这会重置所有设置并重新加载应用。',
        '清除缓存',
        { type: 'error' }
    )
    if (ok) {
        mainStore.clearConfig()
        handleClose()
        window.location.reload()
    }
}

// 关闭对话框
const handleClose = () => {
    visible.value = false
    emit('close')
}

// 监听主 store 变化
watch(
    () => mainStore.editor,
    (newSettings) => {
        localSettings.value = { ...newSettings }
    },
    { deep: true }
)

watch(
    () => mainStore.autoSave,
    (newAutoSave) => {
        localAutoSave.value = { ...newAutoSave }
    },
    { deep: true }
)
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.settings-dialog {
    max-height: 70vh;
    overflow-y: auto;
    padding-right: 4px;
}

.settings-section {
    & + .settings-section {
        margin-top: @spacing-xl;
        padding-top: @spacing-xl;
        border-top: 1px solid var(--border);
    }

    .section-title {
        display: flex;
        align-items: baseline;
        gap: @spacing-md;
        margin-bottom: @spacing-lg;

        span:first-child {
            font-size: @font-size-md;
            font-weight: @font-weight-semibold;
            color: var(--text-1);
        }

        .section-hint {
            font-size: @font-size-sm;
            color: var(--text-3);
        }
    }
}

.palette-row {
    display: flex;
    gap: @spacing-md;
    margin-bottom: @spacing-xl;

    .palette-chip {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 120px;
        height: 56px;
        border-radius: @radius-lg;
        cursor: pointer;
        font-size: @font-size-base;
        transition: all @transition-fast;
        box-shadow: var(--shadow-sm);

        .chip-name {
            font-weight: @font-weight-semibold;
        }

        &:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }

        &.is-active {
            outline: 2px solid var(--accent);
            outline-offset: 1px;
        }
    }
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: @spacing-lg @spacing-xl;

    &.form-grid-2 {
        gap: @spacing-lg @spacing-xl;
    }

    .form-item {
        &.form-item {
            grid-column: span 2;
        }

        &:first-child {
            grid-column: span 1;
        }

        label {
            display: block;
            margin-bottom: @spacing-sm;
            font-size: @font-size-base;
            color: var(--text-1);
            font-weight: @font-weight-medium;
        }
    }
}

.data-management {
    display: flex;
    align-items: center;
    gap: @spacing-md;

    .danger-action {
        padding: 9px 16px;
        border: 1px solid var(--danger);
        background: var(--danger-soft);
        color: var(--danger);
        border-radius: @radius-md;
        cursor: pointer;
        font-size: @font-size-base;
        font-weight: @font-weight-medium;
        transition: all @transition-fast;

        &:hover {
            background: var(--danger);
            color: #fff;
        }
    }

    .danger-hint {
        font-size: @font-size-sm;
        color: var(--text-3);
    }
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: @spacing-sm;
}
</style>
