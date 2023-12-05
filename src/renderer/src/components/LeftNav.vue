<template>
    <div class="left">
        <div class="nav">
            <button @click="openValue = true">新建</button>
            <button @click="openFile">打开</button>
            <button :disabled="mainState.isfile" @click="save" :style="{ backgroundColor: mainState.isChangeFile ? 'red': 'none' }">保存</button>
        </div>
        <div class="title">
            <input v-if="fileState.name && titileChange === true" v-model="fileState.name" type="text">
            <span v-if="fileState.name && titileChange === false" @click="titileChange = true">{{ fileState.name }}</span>
            <span v-else>....</span>
        </div>
    </div>
    <el-dialog v-model="openValue" title="新建" width="500" draggable>
        <el-form label-width="60px">
            <el-form-item label="书名：">
                <el-input v-model="fileName"/>
            </el-form-item>
            <el-form-item label="路径：">
                <el-input v-model="path">
                    <template #append>
                        <span :style="{ cursor: 'pointer',userSelect: 'none' }" @click="changePath">路径</span>
                    </template>
                </el-input>
            </el-form-item>
        </el-form>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="openValue = false">取消</el-button>
                <el-button type="primary" @click="saveEnter">确定 </el-button>
            </span>
        </template>
    </el-dialog>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fileStore, mainStore } from '../utils/stor'
import { CurrentInfo } from '@renderer/utils/types';
const fileState = fileStore()
const mainState = mainStore()
const fileName = ref('')
const path = ref(mainState.defaultPath)
const titileChange = ref(false)
const openValue = ref(false)

const openInsert = () =>{
    if (openValue.value) return
    openValue.value = true
}
/**
 * 保存当前文件
 */
const save = () => {
    window.electron.ipcRenderer.send('save-file-main', mainState.historicalFiles[0], fileState.getJosnElement())
    mainState.changeFile('isChangeFile', false)
}
/**
 * 新建文件啊
 */
const saveEnter = () => {
    if (!fileName.value) {
        ElMessage.warning('请输入书名')
        return 
    }
    if (!path.value) {
        ElMessage.warning('请选择正确的文件路径')
        return 
    }
    const result = `${path.value}\\${fileName.value}.xstxt`
    window.electron.ipcRenderer.send('save-file-main', result, JSON.stringify(new CurrentInfo(fileName.value)))
    window.electron.ipcRenderer.on('save-file', (ev, resolve) => {
        ev || ev
        if (resolve) {
            window.electron.ipcRenderer.send('read-file-main', result)
            mainState.changeFile('isfile', true)
        }
        else ElMessage.error('新增失败')
    })
}


/**
 * 打开文件
 */
const openFile = () => {
    window.electron.ipcRenderer.send('read-file-path-main', path.value, 'file')
}

/**
 * 选择路径
 */
const changePath = () => {
    window.electron.ipcRenderer.send('read-file-path-main', path.value, 'dir')
}


// 监听读取文件
window.electron.ipcRenderer.on('read-file',(ev, data: string) => {
    ev || ev
    const result = JSON.parse(data) as CurrentInfo
    fileState.openNewBook(result)
})

// 监听读取文件路径
window.electron.ipcRenderer.on('read-file-path',(ev, value: string, type: 'dir' | 'file') => {
    ev || ev
    if (type === 'dir' ) mainState.changedefaultPath(value)
    else {
        mainState.historicalFilesAdd(value)
        let list = value.split('\\')
        list.pop()
        mainState.changedefaultPath(list.join('\\'))
        window.electron.ipcRenderer.send('read-file-main', value)
    }
})


watch(() => mainState.defaultPath ,(newValue) =>{
    path.value = newValue
})

defineExpose({openInsert, save})
</script>
<style scoped lang="less">
.left{
    width: 20%;
    height: 100%;
    .nav {
        display: flex;
        margin-bottom: 10px;
        box-shadow: 0 0 1px rgba(0,0,0,.5);
        button{
            flex: 1;
            background: none;
            box-shadow: 0 0 1px rgb(0, 0, 0);
            border: none;
            outline: none;
            line-height: 30px;
        }
    }
}
</style>