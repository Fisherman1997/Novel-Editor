<template>
    <div class="head">
        <div class="title">
            <img src="../assets/image/icon.ico" alt="logo" />
            <span>小说编辑器</span>
        </div>
        <span v-if="mainState.isfile" class="file-name">{{ mainState.getFileName }}</span>
        <span v-else class="file-name">[空]</span>
        <div class="right">
            <button :style="{ transform: 'scaleX(0.5)' }" @click="changeWin('minimize')">一</button>
            <button :style="{ 'margin-left': '10px' }" @click="handleClose">×</button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { mainStore } from '@renderer/store/store.main'
import { controlWindowType } from '../../../types/types';

const mainState = mainStore()

const handleClose = () => {
    window.close()
}

const handleCloseFn = (ev: Event) => {
    if (mainState.isChangeFile) {
        ev.preventDefault()
        ElMessageBox.confirm('文件未保存， 强制退出可能丢失部分数据,确认退出？', '警告', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'warning'
        })
            .then(() => {
                window.removeEventListener('beforeunload', handleCloseFn)
                window.api.changeWindow('close')
            })
            .catch(() => {})
    } else window.api.changeWindow('close')
}

onMounted(() => {
    window.addEventListener('beforeunload', handleCloseFn)
})

const changeWin = (type: controlWindowType) => {
    window.api.changeWindow(type)
}
</script>
<style scoped lang="less">
.head {
    padding: 0 15px;
    -webkit-app-region: drag;
    height: 30px;
    background-color: rgb(238, 238, 238);
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
    position: relative;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .file-name {
        color: #414141;
    }
    .title {
        user-select: none;
        -webkit-app-region: no-drag;
        display: flex;
        align-items: center;
        justify-content: center;
        img {
            width: 20px;
            margin-right: 8px;
        }
    }
    .right {
        -webkit-app-region: no-drag;
        button {
            cursor: pointer;
            margin: 0 5px;
            background: none;
            border: none;
            font-size: 26px;
        }
    }
}
</style>
