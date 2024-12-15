<template>
    <el-button size="small" @click="openValue = true">设置</el-button>
    <el-dialog v-model="openValue" title="设置" width="400" draggable :modal="false">
        <div class="content-set">
            <div class="item">
                <span>字体大小</span>
                <el-input-number v-model="editorTextSize" size="small" :min="12" :max="36" />
            </div>
            <div class="item">
                <span>文字行高</span>
                <el-input-number
                    v-model="mainState.fontLineHeight"
                    size="small"
                    :min="editorTextSize"
                    :max="36"
                />
            </div>
            <div class="item">
                <span>字体样式</span>
                <el-select v-model="mainState.contentFamily" size="small">
                    <el-option
                        v-for="item in fontStyleList"
                        :key="item"
                        :label="item"
                        :value="item"
                    />
                </el-select>
            </div>
            <div class="item">
                <span>文字颜色</span>
                <el-color-picker v-model="mainState.fontColor" />
            </div>
            <div class="item">
                <span>背景颜色</span>
                <el-color-picker v-model="mainState.background" />
            </div>
            <div class="item">
                <el-button size="small" :type="'warning'" @click="handelClear">清楚缓存</el-button>
            </div>
            <div class="item">
                <el-slider v-model="mainState.rightWidth" size="small" />
            </div>
        </div>
    </el-dialog>
</template>

<script lang="ts" setup>
import { ref, reactive, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { mainStore } from '@renderer/store/store.main'
const mainState = mainStore()
const openValue = ref(false)

const editorTextSize = ref(parseInt(mainState.editorTextSize))
const fontStyleList = reactive(['自定义黑体', '自定义宋体'])

const handelClear = () => {
    ElMessageBox.confirm('确认清楚缓存吗？', '警告', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
    })
        .then(() => {
            mainState.deleteLocalStorage()
            window.electron.ipcRenderer.send('app-relaunch')
        })
        .catch(() => {})
}

watch(
    () => editorTextSize.value,
    (newValue) => {
        mainState.changeStyle('editorTextSize', newValue)
    }
)
</script>

<style scoped lang="less">
.content-set {
    .item {
        margin-bottom: 10px;
        > span::after {
            content: '：';
        }
    }
}
</style>
