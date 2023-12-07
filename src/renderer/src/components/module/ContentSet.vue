<template>
    <el-button @click="openValue = true" size="small">设置</el-button>
    <el-dialog 
        v-model="openValue" 
        title="设置" 
        width="400" 
        draggable 
        :modal="false">
        <div class="constent-set">
            <div class="itme">
                <span>字体大小</span>
                <el-input-number size="small" :min="12" :max="36" v-model="editorTextSize" />
            </div>
            <div class="itme">
                <span>文字行高</span>
                <el-input-number size="small" :min="editorTextSize" :max="36" v-model="mainState.fontLineHeighr" />
            </div>
            <div class="itme">
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
            <div class="itme">
                <span>文字颜色</span>
                <el-color-picker v-model="mainState.fontColor" />
            </div>
            <div class="itme">
                <span>背景颜色</span>
                <el-color-picker v-model="mainState.background" />
            </div>
        </div>
    </el-dialog>
</template>

<script lang="ts" setup>
import { ref, reactive, watch } from 'vue';
import { mainStore } from '@renderer/store/store.main';
const mainState = mainStore()
const openValue = ref(false)

const editorTextSize = ref(parseInt(mainState.editorTextSize))
const fontStyleList = reactive(['自定义黑体','自定义宋体'])

watch(() => editorTextSize.value, newValue => {
    mainState.changeStyle('editorTextSize',newValue)
})

</script>

<style scoped lang="less">
.constent-set{
    .itme {
        margin-bottom: 10px;
        > span::after{
            content: '：';
        }
    }
}
</style>