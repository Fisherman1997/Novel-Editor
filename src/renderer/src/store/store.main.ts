import { defineStore } from 'pinia'

interface mainStoreType {
    isfile: boolean,
    isChangeFile: boolean,
    historicalFiles: string[],
    editorTextSize: string,
    background: string,
    defaultPath: string,
    selectItme: [number, number],
    contentFamily: '自定义黑体' | '自定义宋体'
    fontColor: string,
    fontLineHeighr: number
}
type changeStyleAge = { background: string , editorTextSize: number }
export const mainStore = defineStore('main', {
    state: () =>  {
        let edf: mainStoreType = {
            isfile: false,
            isChangeFile: false,
            background: '#fcf6e9',
            editorTextSize: '18px',
            historicalFiles: [],
            defaultPath: `C:\\Users\\Administrator\\Desktop`,
            selectItme: [0,0],
            contentFamily: '自定义黑体',
            fontColor: '#091046',
            fontLineHeighr: 28
        }
        if (localStorage.getItem('main')) edf = JSON.parse(<string>localStorage.getItem('main'))
        edf.isfile = false
        if (edf.historicalFiles.length) window.electron.ipcRenderer.send('read-file-main', edf.historicalFiles[0])
        return <mainStoreType>{
            ...edf
        }
    },
    getters: {
        getFileName: (state) => {
            if (!state.historicalFiles.length) return ''
            const result = state.historicalFiles[0].split('\\')
            return result[result.length - 1]
        }
    },
    actions: {
        /**
         * @param type isfile是否有文件，文件是被修改
         * @param value 布尔值
         */
        changeFile(type: 'isfile'| 'isChangeFile' ,value){ this[type] = value },
        /**
         * @param type background编辑器背景色，editorTextSize文字大小
         * @param value 
         */
        changeStyle<T extends keyof changeStyleAge>(type: T ,value: changeStyleAge[T]){ 
            if (type === 'editorTextSize') this[type] = value + 'px'
            else this[type] = <string>value
        },
        /**
         * 历史记录添加
         */
        historicalFilesAdd(value: string)  {
            const result = this.historicalFiles.filter(itme => itme !== value)
            result.unshift(value)
            if (this.historicalFiles.length > 30) result.pop()
            this.historicalFiles = result
        },
        changedefaultPath(value: string) {
            this.defaultPath = value
        },
        setLocalStorage(){
            const {
                isfile,
                isChangeFile,
                background,
                editorTextSize,
                historicalFiles,
                defaultPath,
                selectItme,
                contentFamily,
                fontColor,
                fontLineHeighr
            } = this
            localStorage.setItem('main', JSON.stringify({
                isfile,
                isChangeFile,
                background,
                editorTextSize,
                historicalFiles,
                defaultPath,
                selectItme,
                contentFamily,
                fontColor,
                fontLineHeighr
            }))
        },
        selectChange(volumeIndex: number, characterIndex = 0){
            this.selectItme = [ volumeIndex, characterIndex ]
        }
    }
})