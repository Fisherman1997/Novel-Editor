<template>
    <div class="left">
        <LeftNavCtrl ref="navCtrl" />
        <div class="title" v-if="fileState.name">
            <TitleChange :name="fileState.name" @changeName="(value) => fileState.changeName('book', { value, index: 0 })" />
        </div>
        <div class="list">
            <template v-if="mainState.isfile && fileState.volume.length">
                <div 
                    class="volume" 
                    v-for="(itme, index) in fileState.volume" 
                    :style="{ height: mainState.selectItme[0] === index && itme.chapterList && itme.chapterList.length ? 
                        ((itme.chapterList.length * 28) + 32) + 'px'
                        : '32px'  }" 
                    :key="index">
                    <div class="volume-title" @click="(ev) => volumeSelect(ev,index)"> 
                        <div class="volume-title-text" :class="{ 'select-volume-title': mainState.selectItme[0] === index }">
                            <b>‣</b>
                            <TitleChange :name="<string>itme.volumeName" @changeName="(value) => fileState.changeName( 'volumeName',{ value, index } )" />
                        </div>
                        <div class="volume-title-ctrl">
                            <span @click="handleAddChapter(index)">+</span>
                            <el-popconfirm 
                                title="确认删除吗？" 
                                @confirm="handleDelete('volume',[index])" 
                                confirm-button-text="确认" 
                                cancel-button-text="取消">
                                <template #reference>
                                    <span>-</span>
                                </template>
                            </el-popconfirm>
                        </div>
                    </div>
                    <template v-if="itme.chapterList.length">
                        <div 
                            class="chapter" 
                            v-for="(citme,cIndex) in itme.chapterList" 
                            :key="cIndex" 
                            :style="{ color: mainState.selectItme[0] === index && mainState.selectItme[1] === cIndex ? 'red' : ''}">
                            <div class="chapter-text">
                                <TitleChange 
                                    @click="mainState.selectChange(index, cIndex)" 
                                    :name="<string>citme.chapterName" 
                                    @changeName="(value) => fileState.changeName( 'chapterName',{ value, index: [index, cIndex] } )" />
                            </div>
                            <!-- <span @click="mainState.selectChange(index, cIndex)">{{ citme.chapterName }}</span> -->
                            <div class="chapter-delete">
                                <el-popconfirm 
                                    title="确认删除吗？" 
                                    @confirm="handleDelete('chapter',[index, cIndex])" 
                                    confirm-button-text="确认" 
                                    cancel-button-text="取消">
                                    <template #reference>
                                        <span style="color: #e98a8a;">-</span>
                                    </template>
                                </el-popconfirm>
                            </div>
                        </div>
                    </template>
                </div>
            </template>
            <span v-else>（无内容）</span>
            <div v-if="mainState.isfile" class="list-ctrl" @click="handlevVolumeAdd">
                <button>新增</button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import LeftNavCtrl from './module/LeftNavCtrl.vue'
import TitleChange from './module/TitleChange.vue'

import { fileStore } from '../store/store.file'; 
import { mainStore } from '../store/store.main';



const fileState = fileStore()
const mainState = mainStore()
const navCtrl = ref()



const handleAddChapter = (index) => {
    fileState.addChapter(index)
    mainState.selectChange(index, fileState.volume[index].chapterList.length - 1)
}
const handleDelete =(type: 'volume' | 'chapter', index: [number, number?]) => {
    if (typeof index[1] === 'number' && 
        fileState.volume[index[0]].chapterList.length > 1) mainState.selectChange(index[0], index[1] - 1)
    fileState.dalete(type, index)
}

const volumeSelect = (ev: MouseEvent, index: number) => {
    const target = ev.target as HTMLElement
    const parentNode = target.parentNode as HTMLElement
    if (target.className === 'volume-title-text' || parentNode.className === 'volume-title-text') mainState.selectChange(index)
}

const handlevVolumeAdd = () => {
    fileState.addVolume()
}


// watch(() => fileState.volume,(newValue) => {
//     bookDirectory.list = newValue
// })

const save = () => {
    navCtrl.value.save()
}
const openInsert = () => {
    navCtrl.value.openInsert()
}
/**
 * 允许父级使用方法
 */
defineExpose({openInsert  , save})
</script>
<style scoped lang="less">
.left{
    width: 250px;
    height: 100%;
    display: flex;
    flex-direction: column;
    .title {
        border-bottom: 1px solid #dfdfdf;
        padding: 0 5px 10px;
        margin-bottom: 5px;
        font-size: 16px;
    }
    .list{
        flex: 1;
        overflow-x: hidden;
        overflow-y: auto;
        .list-ctrl{
            display: flex;
            button{
                flex: 1;
                background-color: none;
                box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
                border: none;
                outline: none;
                padding: 5px 0;
            }
        }
        .volume{
            transition: all 0.2s;
            overflow: hidden;
            .volume-title {
                display: flex;
                cursor: pointer;
                // margin: 5px 0;
                padding: 5px 10px;
                box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
                background-color: rgb(250, 250, 250);
                line-height: 20px;
                color: #323d46;
                font-size: 14px;
                font-weight: 500;
                .volume-title-text{
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                    b{
                        transform-origin: center;
                        transition: all 0.2s;
                        display: block;
                        margin-right: 5px;
                        font-size: 18px;
                        line-height: 20px;
                        padding-left: 3px;
                    }
                    span {
                        flex: 1;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                }
                .select-volume-title b{
                    transform: rotate(90deg) !important;
                }
                .volume-title-ctrl{
                    user-select: none;
                    font-size: 18px;
                    span{
                        cursor: pointer;
                        margin: 0 3px;
                    }
                    span:nth-child(2){
                        color: rgb(233, 138, 138);
                    }
                }
            }
            .chapter{
                display: flex;
                cursor: pointer;
                border-left: rgba(0, 0, 0, 0.3) dashed 2px;
                box-shadow: 0 0 1px rgba(0, 0, 0, 0.2);
                padding: 5px 5px;
                font-size: 12px;
                margin-left: 5px;
                overflow: hidden;
                .chapter-text{
                    line-height: 18px;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .chapter-delete {
                    user-select: none;
                    // transform: scale(2);
                    font-size: 18px;
                    line-height: 16px;
                }
            }

        }
        // .select-volume{
        //     transition: all 0.3s;
        //     height: 36px;
        //     overflow: hidden;
        // }
    }
}
</style>