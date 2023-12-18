<template>
    <el-button @click="openValue = true" size="small">导出</el-button>
    <el-dialog 
        v-model="openValue" 
        title="导出" 
        width="500" 
        draggable 
        :modal="false">
        <div class="export">
            <div class="itme">
                <span>路径</span>
                <el-input size="small" v-model="mainState.defaultPath">
                    <template #append>
                        <span :style="{ cursor: 'pointer',userSelect: 'none' }" @click="changePath">路径</span>
                    </template>
                </el-input>
            </div>
            <div>
                <el-button @click="handleExportAll">全书导出</el-button>
                <!-- <el-button>按卷导出</el-button>
                <el-button>按章导出</el-button> -->
            </div>
        </div>
    </el-dialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { mainStore } from '@renderer/store/store.main';
import { fileStore } from '@renderer/store/store.file';
import { CurrentInfo } from '@renderer/utils/types';
import { deepClone } from '@renderer/utils/common'

import { ElNotification } from 'element-plus'

const mainState = mainStore()
const fileState = fileStore()
const openValue = ref(false)

const changePath = () => {
    window.electron.ipcRenderer.send('read-file-path-main', mainState.defaultPath ,'dir')
}


const handleExportAll = () => {
    if (fileState.volume.length && fileState.volume[0].chapterList.length) {

        window.electron.ipcRenderer.send('export', { type: 'all', data: getFlieElement(), path: mainState.defaultPath})
    } else {
        ElNotification.warning({
            title: '提示',
            message: '当前文件无章节内容，无法导出'
        })
    }
}

const getFlieElement = () => {
    const result: CurrentInfo = {
        name: fileState.name,
        volume: deepClone(fileState.volume),
        worldView: deepClone(fileState.worldView),
        character: deepClone(fileState.character)
    }
    result.volume = result.volume.map(itme => {
        itme.chapterList = itme.chapterList.map(citme => {
            citme.list = `　　${citme.list?.join('\n\n　　')}` as any
            return citme
        })
        return itme
    })
    return result
}

window.electron.ipcRenderer.on('export-result', (ev, value) => {
    ev || ev
    if (value) ElNotification({
        title: '提示',
        offset: 40,
        message: '导出成功',
        type: 'success'
    })
    else ElNotification({
        title: '警告',
        offset: 40,
        message: '导出失败',
        type: 'error'
    })
})

</script>

<style scoped lang="less">
.export{
    .itme {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        > span::after{
            content: '：';
        }
        .el-input {
            flex: 1;
        }
    }
}
</style>