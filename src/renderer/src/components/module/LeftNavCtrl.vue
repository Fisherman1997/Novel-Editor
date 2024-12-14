<template>
    <div class="nav">
        <button @click="openValue = true">新建</button>
        <button @click="openFile">打开</button>
        <button
            :style="{
                backgroundColor: mainState.isfile ? '#fff' : 'rgba(0,0,0,.1)',
                color: mainState.isfile
                    ? mainState.isChangeFile
                        ? 'red'
                        : '#000'
                    : 'rgba(0,0,0,.1)',
                cursor: mainState.isfile ? 'pointer' : 'no-drop'
            }"
            @click="save"
        >
            保存
        </button>
    </div>
    <el-dialog v-model="openValue" title="新建" width="500" draggable :modal="false">
        <el-form label-width="60px">
            <el-form-item label="书名：">
                <el-input v-model="fileName" size="small" />
            </el-form-item>
            <el-form-item label="路径：">
                <el-input v-model="path" size="small">
                    <template #append>
                        <span :style="{ cursor: 'pointer', userSelect: 'none' }" @click="changePath"
                            >路径</span
                        >
                    </template>
                </el-input>
            </el-form-item>
        </el-form>
        <template #footer>
            <span class="dialog-footer">
                <el-button size="small" @click="openValue = false">取消</el-button>
                <el-button size="small" type="primary" @click="saveEnter">确定 </el-button>
            </span>
        </template>
    </el-dialog>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue'
import { ElNotification } from 'element-plus'
import { fileStore } from '../../store/store.file'
import { mainStore } from '../../store/store.main'
import { CurrentInfo } from '../../../../types/types'


const fileState = fileStore()
const mainState = mainStore()
const openValue = ref(false)
const fileName = ref('')
const path = ref(mainState.defaultPath)


const handleReadFile = (data: string) => {
    const result = JSON.parse(data) as CurrentInfo
    fileState.openNewBook(result)
    mainState.changeFile('isfile', true)
    mainState.setLocalStorage()
}


const handleReadFilePath = async (value: string, type: 'dir' | 'file') => {
    if (type === 'dir') {
        console.log(value)
        mainState.changedefaultPath(value)
    } else {
        mainState.historicalFilesAdd(value)
        const list = value.split('\\')
        list.pop()
        mainState.changedefaultPath(list.join('\\'))
        mainState.changeFile('isChangeFile', false)
        mainState.changeFile('isfile', true)
        // console.log(value)
        const fileStateElement = await window.electron.ipcRenderer.invoke('read-file-main', value)
        if (typeof fileStateElement !== "string") return
        handleReadFile(fileStateElement)
    }
}

/**
 * 打开文件
 */
const openFile = async () => {
    const result = await window.electron.ipcRenderer.invoke('read-file-path-main', path.value, 'file')
    if(typeof result !== 'string') return
    await handleReadFilePath(result, 'file')
}

/**
 * 打开新建弹窗
 */
const openInsert = () => {
    if (openValue.value) return
    openValue.value = true
}


const handleSaveFile = (saveResult: boolean, result: string) => {
    if (saveResult) {
        window.electron.ipcRenderer.send('read-file-main', result)
        mainState.historicalFilesAdd(result)
        mainState.changedefaultPath(path.value)
        mainState.changeFile('isfile', true)
        openValue.value = false
        fileName.value = ''
    } else {
        ElNotification.error({
            title: '提示',
            message: '新增失败',
            offset: 40
        })
    }
}

/**
 * 新建文件啊
 */
const saveEnter = async () => {
    if (!fileName.value) {
        ElNotification({
            type: 'warning',
            title: '警告',
            message: '请输入书名',
            offset: 40
        })
        return
    }
    if (!path.value) {
        ElNotification({
            type: 'warning',
            title: '警告',
            message: '请选择正确的文件路径',
            offset: 40
        })
        return
    }
    const result = `${path.value}\\${fileName.value}.xstxt`

    const saveResult = await window.electron.ipcRenderer.invoke(
        'save-file-main',
        result,
        JSON.stringify(new CurrentInfo(fileName.value))
    ) as boolean
    handleSaveFile(saveResult, result)
}



/**
 * 选择路径
 */
const changePath = async () => {
    const result = await window.electron.ipcRenderer.invoke('read-file-path-main', path.value, 'dir')
    if(typeof result !== 'string') return
    await handleReadFilePath(result, 'dir')
}

/**
 * 保存当前文件
 */
const save = async () => {
    if (!mainState.isfile) return
    if (!mainState.isChangeFile) return
    await window.electron.ipcRenderer.invoke(
        'save-file-main',
        mainState.historicalFiles[0],
        fileState.getJosnElement()
    )
    mainState.changeFile('isChangeFile', false)
}

// 监听是否是通过文件打开
window.electron.ipcRenderer.on("file-start", (_event, filePath: string) => {
    handleReadFilePath(filePath, 'file')
})

onMounted( async () => {
    const is_start_file = await window.electron.ipcRenderer.invoke('is_start_file') as boolean
    if (is_start_file) {
        window.electron.ipcRenderer.send('chunk-file')
    } else if (mainState.historicalFiles.length) {
        await handleReadFilePath(mainState.historicalFiles[0], 'file')
    }
})

// 监听全局mainState.defaultPath，path跟随变化
watch(
    () => mainState.defaultPath,
    (newValue) => {
        path.value = newValue
    }
)

/**
 * 允许父级使用方法
 */
defineExpose({ openInsert, save })
</script>

<style scoped lang="less">
.nav {
    display: flex;
    margin-bottom: 10px;
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
    button {
        flex: 1;
        background: none;
        box-shadow: 0 0 1px rgb(0, 0, 0);
        border: none;
        outline: none;
        line-height: 30px;
    }
}
</style>
