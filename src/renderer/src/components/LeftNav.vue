<template>
    <div class="left">
        <LeftNavCtrl ref="navCtrl" />
        <div class="title" v-if="fileState.name">
            <TitleChange :name="fileState.name" @changeName="(value) => changeNmae( 'book', { value, index: 0 })" />
        </div>
        <div class="list">
            <template v-if="mainState.isfile && bookDirectory.list.length">
                <div 
                    class="volume" 
                    v-for="(itme, index) in bookDirectory.list" 
                    :style="{ height: mainState.selectItme[0] === index ? 
                        ((itme.chapterList.length * 26) + 10 + 36) + 'px'
                        : '36px'  }" 
                    :key="index">
                    <div class="volume-title" @click="(ev) => volumeSelect(ev,index)">
                        <div class="volume-title-text" :class="{ 'select-volume-title': mainState.selectItme[0] === index }">
                            <i>></i>
                            <TitleChange :name="<string>itme.volumeName" @changeName="(value) => changeNmae( 'volumeName',{ value, index } )" />
                        </div>
                        <div class="volume-title-ctrl">
                            <span>+</span>
                            <span>-</span>
                        </div>
                    </div>
                    <template v-if="itme.chapterList.length">
                        <div 
                            class="chapter" 
                            v-for="(citme,cIndex) in itme.chapterList" 
                            :key="cIndex" 
                            :style="{ color: mainState.selectItme[0] === index && mainState.selectItme[1] === cIndex ? 'red' : ''}">
                            <TitleChange 
                                @click="mainState.selectChange(index, cIndex)" 
                                :name="<string>citme.chapterName" 
                                @changeName="(value) => changeNmae( 'chapterName',{ value, index: [index, cIndex] } )" />
                            <!-- <span @click="mainState.selectChange(index, cIndex)">{{ citme.chapterName }}</span> -->
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
import { ref, watch, reactive, onMounted } from 'vue'
import LeftNavCtrl from './module/LeftNavCtrl.vue'
import TitleChange from './module/TitleChange.vue'

import { fileStore, nameType } from '../store/store.file'; 
import { mainStore } from '../store/store.main';
import { volumetype } from '@renderer/utils/types';



const fileState = fileStore()
const mainState = mainStore()
const navCtrl = ref()
const bookDirectory = reactive<{ list: volumetype[] }>({
    list: []
})

const changeNmae = (type: nameType ,data: { value: string, index: number[] | number}) => {
    fileState.changeName(type, data)
}


const volumeSelect = (ev: MouseEvent, index: number) => {
    const target = ev.target as HTMLElement
    const parentNode = target.parentNode as HTMLElement
    if (target.className === 'volume-title-text' || parentNode.className === 'volume-title-text') mainState.selectChange(index)
}

const handlevVolumeAdd = () => {
    fileState.addVolume()
}


watch(() => fileState.volume,(newValue) => {
    bookDirectory.list = newValue
})
onMounted(() => {
    if (mainState.historicalFiles.length) {
        window.electron.ipcRenderer.send('read-file-main', mainState.historicalFiles[0])
    }
})
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
    width: 20%;
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
                margin: 5px 0;
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
                    i{
                        transition: all 0.2s;
                        display: block;
                        margin-right: 5px;
                        font-size: 18px;
                        line-height: 20px;
                    }
                    span {
                        flex: 1;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                }
                .select-volume-title i{
                    transform: rotate(90deg) !important;
                }
                .volume-title-ctrl{
                    font-size: 18px;
                    span{
                        cursor: pointer;
                        margin: 0 3px;
                    }
                    
                }
                .volume-title-ctrl:nth-child{
                    color: red;
                }

            }
            .chapter{
                cursor: pointer;
                margin: 10px 0;
                font-size: 12px;
                padding: 0 5px;
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