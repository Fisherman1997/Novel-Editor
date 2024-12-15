<template>
    <div class="content" :style="{ backgroundColor: mainState.background }">
        <p v-if="mainState.isfile" class="route">{{ titleRouter }}</p>
        <div
            ref="text"
            :style="{
                fontFamily: mainState.contentFamily,
                fontSize: mainState.editorTextSize,
                color: mainState.fontColor,
                lineHeight: mainState.fontLineHeight + 'px'
            }"
            class="text"
            :contenteditable="editable"
            @input="changeText"
        ></div>
        <div class="footer">
            <div class="ctrl">
                <ElSpace :size="'large'">
                    <ContentSet />
                    <ExportModule />
                </ElSpace>
            </div>
            <ElSpace :size="'large'">
                <span>{{ totalAll }}</span>
                <span>{{ total }}</span>
            </ElSpace>
        </div>
    </div>
</template>
<script setup lang="ts">

import { ref, computed, watch, unref, nextTick } from "vue";
import { mainStore } from '../store/store.main'
import { fileStore } from '../store/store.file'
import { nextCxecute } from '@renderer/utils/common'
import { ElSpace } from 'element-plus'
import ContentSet from './module/ContentSet.vue'
import ExportModule from './module/ExportModule.vue'

const mainState = mainStore()
const fileState = fileStore()
const text = ref()

const editable = computed(() => {
    return (
        mainState.isfile &&
        Boolean(fileState.volume.length) &&
        Boolean(fileState.volume[mainState.selectItem[0]]) &&
        Boolean(fileState.volume[mainState.selectItem[0]].chapterList.length) &&
        Boolean(fileState.volume[mainState.selectItem[0]].chapterList[mainState.selectItem[1]])
    )
})

const changeHtml = (newValue: [number, number]) => {
    if (unref(editable)) {
        const value = fileState.volume[newValue[0]].chapterList[newValue[1]].list as string[]
        text.value.innerHTML = `<div>${value.join('</div>\n<div>')}</div>`
    }
}

const titleRouter = computed(() => {
    if (unref(editable)) {
        return `
            ${fileState.volume[mainState.selectItem[0]].volumeName}
            >
            ${fileState.volume[mainState.selectItem[0]].chapterList[mainState.selectItem[1]].chapterName}
        `
    }
    return ''
})

const changeText = (ev: Event) => {
    const event = ev.target as HTMLInputElement
    const result = event.innerText.split('\n')
    fileState.chapterChange([...mainState.selectItem], result)
}

const total = computed(() => {
    let result = 0
    if (unref(editable)) {
        const list = fileState.volume[mainState.selectItem[0]].chapterList[mainState.selectItem[1]].list as string[]
        list.forEach((item) => (result += item.length))
    }
    return `本章${result}字`
})

const totalAll = computed(() => {
    let result = 0
    if (unref(editable)) {
        fileState.volume.forEach((item) => {
            item.chapterList.forEach((element) => {
                const list = element.list as string[]
                list.forEach((cItem) => (result += cItem.length))
            })
        })
    }
    return `全书${result}字`
})
watch(() => mainState.historicalFiles, () => {
    nextTick(() => changeHtml(mainState.selectItem))
})
watch(() => mainState.selectItem, changeHtml)
watch(
    () => mainState.isfile,
    async (value) => {
        if (value) {
            await nextCxecute()
            changeHtml(mainState.selectItem)
        }
    }
)
</script>

<style lang="less" scoped>
.content {
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
    position: relative;
    flex: 1;
    min-width: 400px;
    overflow: hidden;
    padding: 10px 10px 40px 10px;
    .route {
        padding-bottom: 5px;
        font-size: 12px;
        color: #000;
    }
    .text {
        padding: 10px;
        text-indent: 2em;
        height: calc(100% - 60px);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }
    .text:focus {
        outline: none;
        border: none;
    }
    .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px;
        position: absolute;
        left: 0;
        bottom: 0;
        width: calc(100% - 20px);
        font-size: 14px;
        background-color: #fff;
        box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
    }
}
</style>
