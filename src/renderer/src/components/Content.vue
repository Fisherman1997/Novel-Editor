<template>
    <div class="content" :style="{ backgroundColor: mainState.background }" >
        <p v-if="mainState.isfile" class="route">{{ titleRoter }}</p>
        <div 
            :style="{ 
                fontFamily: mainState.contentFamily, 
                fontSize: mainState.editorTextSize, 
                color: mainState.fontColor , 
                lineHeight: mainState.fontLineHeighr + 'px'}" 
            ref="text" class="text" 
            :contenteditable="editable" 
            @input="changeText"></div>
        <div class="footer">
            <div class="ctrl">
                <ContentSet />
            </div>
            <ElSpace :size="'large'">
                <span>{{ totalAll }}</span>
                <span>{{ total }}</span>
            </ElSpace>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, unref } from 'vue';
import { mainStore } from '../store/store.main';
import { fileStore } from '../store/store.file';
import { nextCxecute } from '@renderer/utils/common';
import { ElSpace } from 'element-plus';
import ContentSet from './module/ContentSet.vue'

const mainState = mainStore()
const fileState = fileStore()
const text = ref()

const editable = computed(() => {
    return mainState.isfile 
            && Boolean(fileState.volume.length)
            && Boolean(fileState.volume[mainState.selectItme[0]]) 
            && Boolean(fileState.volume[mainState.selectItme[0]].chapterList.length)
            && Boolean(fileState.volume[mainState.selectItme[0]].chapterList[mainState.selectItme[1]])
})

const changeHtml = (newValue: [number,number]) => {
    if (unref(editable)) {
        text.value.innerHTML = `<div>${fileState.volume[newValue[0]].chapterList[newValue[1]].list?.join('</div>\n<div>')}</div>`
    }
}

const titleRoter = computed(() => {
    if (unref(editable)) {
        return `
            ${fileState.volume[mainState.selectItme[0]].volumeName}
            > 
            ${fileState.volume[mainState.selectItme[0]].chapterList[mainState.selectItme[1]].chapterName}
        `
    }
    return ''
})


const changeText = (ev) => {
    let result = ev.target.innerText.split('\n')
    fileState.chapterChange([...mainState.selectItme], result)
}

const total = computed(() => {
	let result = 0
    if (unref(editable)) {
        fileState.volume[mainState.selectItme[0]].chapterList[mainState.selectItme[1]].list?.forEach(itme => result += itme.length) 
    }
	return `本章${result}字`
})

const totalAll = computed(() => {
	let result = 0
    if (unref(editable)) {
        fileState.volume.forEach(itme => {
            itme.chapterList.forEach(element => {
                element.list?.forEach(itme => result += itme.length)
            })
        })
    }
	return `全书${result}字`
})



watch(() => mainState.selectItme, changeHtml)
watch(() => mainState.isfile, async (value) => {
    if (value) {
        await nextCxecute()
        changeHtml(mainState.selectItme)
    }
})

</script>

<style lang="less" scoped>
.content{
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
    position: relative;
    flex: 1;
    min-width: 400px;
    overflow: hidden;
    padding: 10px 10px 40px 10px;
    .route{
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
    .text:focus{
        outline: none;
        border: none;
    }
    .footer{
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
