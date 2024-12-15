<template>
    <el-button size="small" @click="openValue = true">导出</el-button>
    <el-dialog v-model="openValue" title="导出" width="500" draggable :modal="false">
        <div class="export">
            <div class="itme">
                <span>路径</span>
                <el-input v-model="mainState.defaultPath" size="small">
                    <template #append>
                        <span :style="{ cursor: 'pointer', userSelect: 'none' }" @click="changePath"
                            >路径</span
                        >
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
import { ref } from 'vue'
import { mainStore } from '@renderer/store/store.main'
import { fileStore } from '@renderer/store/store.file'
import { CurrentInfo } from '../../../../types/types'
import { deepClone } from '@renderer/utils/common'

import { ElNotification } from 'element-plus'

const mainState = mainStore()
const fileState = fileStore()
const openValue = ref(false)

const changePath = () => {
    window.electron.ipcRenderer.invoke('read-file-path-main', mainState.defaultPath, 'dir')
        .then((value: string) => {
            mainState.changeDefaultPath(value)
        })
}

const handleExportAll = async () => {
    if (fileState.volume.length && fileState.volume[0].chapterList.length) {
        const exportBol = await window.electron.ipcRenderer.invoke('export', {
            type: 'all',
            data: getFileElement(),
            path: mainState.defaultPath
        }) as boolean
        if (exportBol) ElNotification({
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
    } else {
        ElNotification.warning({
            title: '提示',
            message: '当前文件无章节内容，无法导出'
        })
    }
}

const getFileElement = () => {
    const result: CurrentInfo = {
        name: fileState.name,
        volume: deepClone(fileState.volume),
        worldView: deepClone(fileState.worldView),
        character: deepClone(fileState.character)
    }
    result.volume = result.volume.map((item) => {
        item.chapterList = item.chapterList.map((cItem) => {
            // eslint-disable-next-line no-irregular-whitespace
            cItem.list = `　　${(cItem.list as string[]).join('\n\n　　')}`
            return cItem
        })
        return item
    })
    return result
}

</script>

<style scoped lang="less">
.export {
    .itme {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        > span::after {
            content: '：';
        }
        .el-input {
            flex: 1;
        }
    }
}
</style>
