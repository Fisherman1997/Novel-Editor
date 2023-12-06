<template>
    <div class="content" >
        <div class="text" :contenteditable="mainState.isfile" @input="changeText"></div>
        <div class="footer">
            <div class="ctrl">
                <span>size：{{ styles.fontSize }}</span>
                <button @click="styles.fontSize++">增大</button>
                <button @click="styles.fontSize--">减小</button>
                <button @click="Jump('https://baidu.com')">百度</button>
                <button @click="Jump('https://yiyan.baidu.com/')">文心</button>
                <button @click="Jump('https://xinghuo.xfyun.cn/desk')">火星</button>
            </div>
            <span>{{ total }}</span>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { mainStore } from '../store/store.main';
const styles = reactive({
	fontSize: 16
})
const mainState = mainStore()
/**
 * 文本存储数组
 */
const content = ref<string[]>([])


/**
 * 新增编辑的项是最后倒数前三滚动跳到最底，反之不操作
 * @param element 滚动元素
 * @param index 元素下标
 */
// const viewBottom = (element, index: number) => {
//     if (content.length - 4 < index)
//     element.scrollTop = element.scrollHeight 
// }
const changeText = (ev) => {
    const result = ev.target.innerHTML
    .split('&nbsp;').join(' ')
    .split('</div>').join('')
    .split('<div>')
	content.value = result
    console.log(content.value)
}

const total = computed(() => {
	let result = 0
	content.value.forEach((itme) => result += itme.length)
	return result + '字'
})



const Jump = (url) => {
    // (window.api! as any).newWin(url)
    window.electron.ipcRenderer.send('new-window',url)
}
</script>

<style lang="less" scoped>
.content{
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
    position: relative;
    background-color: #fcf6e9;
    width: 60%;
    // height: 100%;
    font-family: '小米兰亭', '微软雅黑';
    overflow: hidden;
    padding: 10px 10px 40px 10px;
    .text {
        padding: 10px;
        text-indent: 2em;
        height: calc(100% - 60px);
        // padding-bottom: 20%;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        line-height: 27px;
    }
    .text:focus{
        outline: none;
        border: none;
    }
    .footer{
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px;
        position: absolute;
        left: 0;
        bottom: 0;
        width: calc(100% - 20px);
        font-size: 16px;
        background-color: #fff;
        box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
        button{
            cursor: pointer;
            border-radius: 5px;
            background-color: rgb(22, 224, 231);
            border: none;
            box-shadow: 0 1px 2px rgba(9, 55, 63, 0.3);
            color: #fff;
            padding: 0 3px;
            margin: 0 5px;
        }
    }
}
</style>
