import { defineStore } from 'pinia'
import { CurrentInfo, characterType, worldViewtype } from '../utils/types'
import { mainStore } from './store.main'


export type nameType = 'book' | 'volumeName' | 'worldName' | 'characterName' | 'chapterName'
export const fileStore = defineStore('fileInfo', {
    state: () =>  {
        return { ...new CurrentInfo('') }
    },
    actions: {
        /**
         * 修改名称
         * @param type book书标题，volumeName册标题，chapterName章节标题，worldName世界观标题，characterName人物标题
         * @param data value数据，index要修改的项的下标，type为book传 0
         */
        changeName( type: nameType, data: { value: string, index: number[] | number}) {
            mainStore().changeFile('isChangeFile', true)
            const { value, index } = data
            if (type === 'book') {
                this.name = value
            } else if(type === 'volumeName' && typeof index === 'number') {
                this.volume[index].volumeName = value
            }else if(type === 'worldName' && typeof index === 'number') {
                this.worldView[index].name = value
            }else if(type === 'characterName' && typeof index === 'number') {
                this.character[index].name = value
            }else if(type === 'chapterName'){
                this.volume[index[0]].chapterList[index[1]].chapterName = value
            }
        },
        /**
         * 修改章节内容
         * @param index [册下标，章节下标]
         * @param value [值]
         */
        chapterChange(index: [number, number], value: string[]) {
            mainStore().changeFile('isChangeFile', true)
            this.volume[index[0]].chapterList[index[1]].list = value
        },
        characterChange(index: number, data: characterType){
            mainStore().changeFile('isChangeFile', true)
            this.character[index] = data
        },
        worldViewChange(index: number, data: worldViewtype) {
            mainStore().changeFile('isChangeFile', true)
            this.worldView[index] = data
        },
        /**
         * 打开书籍
         * @param data 
         */
        openNewBook(data: CurrentInfo){
            this.name = data.name
            this.volume = data.volume
            this.worldView = data.worldView
            this.character = data.character
        },
        getJosnElement(){
            const result = {
                name: this.name,
                volume: this.volume,
                worldView: this.worldView,
                character: this.character
            }
            return JSON.stringify(result)
        },
        addVolume() {
            mainStore().changeFile('isChangeFile', true)
            this.volume.push({
                volumeName: '未命名',
                chapterList: []
            })
        },
        addChapter(volumeIndex) {
            mainStore().changeFile('isChangeFile', true)
            this.volume[volumeIndex].chapterList.push({
                chapterName: '未命名',
                list: []
            })
        }
    }
})
