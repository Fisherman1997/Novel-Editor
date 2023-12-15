<template>
    <div class="nav">
        <button @click="openValue = true">新建</button>
        <button @click="openFile">打开</button>
        <button
         @click="save" 
         :style="{ 
            backgroundColor: mainState.isfile ? '#fff' : 'rgba(0,0,0,.1)',
            color:mainState.isfile ? mainState.isChangeFile ? 'red': '#000' : 'rgba(0,0,0,.1)',
            cursor: mainState.isfile ? 'pointer' : 'no-drop'
        }">保存</button>
    </div>
    <el-dialog 
        v-model="openValue" 
        title="新建" 
        width="500" 
        draggable 
        :modal="false">
        <el-form label-width="60px">
            <el-form-item label="书名：">
                <el-input size="small" v-model="fileName"/>
            </el-form-item>
            <el-form-item label="路径：">
                <el-input size="small" v-model="path">
                    <template #append>
                        <span :style="{ cursor: 'pointer',userSelect: 'none' }" @click="changePath">路径</span>
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
import { ref, watch } from 'vue';
import { ElNotification } from 'element-plus'
import { fileStore } from '../../store/store.file'; 
import { mainStore } from '../../store/store.main';
const fileState = fileStore()
const mainState = mainStore()
const openValue = ref(false)
const fileName = ref('')
const path = ref(mainState.defaultPath)
import { CurrentInfo } from '@renderer/utils/types';

/**
 * 打开文件
 */
const openFile = () => {
    window.electron.ipcRenderer.send('read-file-path-main', path.value, 'file')
}

/**
 * 打开新建弹窗
 */
const openInsert = () =>{
    if (openValue.value) return
    openValue.value = true
}

/**
 * 新建文件啊
 */
 const saveEnter = () => {
    if (!fileName.value) {
        ElNotification({
            type: 'warning',
            title: '警告',
            message: '请输入书名',
            offset: 40,
        })
        return 
    }
    if (!path.value) {
        ElNotification({
            type: 'warning',
            title: '警告',
            message: '请选择正确的文件路径',
            offset: 40,
        })
        return 
    }
    const result = `${path.value}\\${fileName.value}.xstxt`
    window.electron.ipcRenderer.send('save-file-main', result, JSON.stringify(new CurrentInfo(fileName.value)))
    window.electron.ipcRenderer.on('save-file', (ev, resolve) => {
        ev || ev
        if (resolve) {
            window.electron.ipcRenderer.send('read-file-main', result)
            mainState.historicalFilesAdd(result)
            mainState.changedefaultPath(path.value)
            mainState.changeFile('isfile', true)
            openValue.value = false
            fileName.value = ''
        }
        else {
            ElNotification.error({
                title: '提示',
                message: '新增失败',
                offset: 40,
            })
        }   
    })
}

// 监听全局mainState.defaultPath，path跟随变化
watch(() => mainState.defaultPath ,(newValue) =>{
    path.value = newValue
})

/**
 * 选择路径
 */
const changePath = () => {
    window.electron.ipcRenderer.send('read-file-path-main', path.value, 'dir')
}


/**
 * 保存当前文件
 */
const save = () => {
    if (!mainState.isfile) return
    if (!mainState.isChangeFile) return
    window.electron.ipcRenderer.send('save-file-main', mainState.historicalFiles[0], fileState.getJosnElement())
    mainState.changeFile('isChangeFile', false)
}


// 监听读取文件
window.electron.ipcRenderer.on('read-file',(ev, data: any) => {
    ev || ev
    const result = JSON.parse(data) as CurrentInfo
    fileState.openNewBook(result)
    mainState.changeFile('isfile', true)
    mainState.setLocalStorage()
})

// 监听读取文件路径
window.electron.ipcRenderer.on('read-file-path',(ev, value: string, type: 'dir' | 'file') => {
    ev || ev
    if (type === 'dir' ) {
        console.log(value)
        mainState.changedefaultPath(value)
    }
    else {
        mainState.historicalFilesAdd(value)
        let list = value.split('\\')
        list.pop()
        mainState.changedefaultPath(list.join('\\'))
        mainState.changeFile('isChangeFile', false)
        mainState.changeFile('isfile', true)
        // console.log(value)
        window.electron.ipcRenderer.send('read-file-main', value)
    }
})

/**
 * 允许父级使用方法
 */
 defineExpose({openInsert, save})

</script>

<style scoped lang="less">
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
</style>