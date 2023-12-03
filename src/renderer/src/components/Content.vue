<template>
    <div class="content">
        <div class="text" @click="liFocus">
            <li 
                v-for="(text,index) in content"	
                contenteditable="true" 
                :style="{ fontSize: styles.fontSize + 'px' }"
                @input="(ev) => changeText(ev, index)"
                @keydown="(ev) => nextText(ev, index)">{{text}}</li>
        </div>
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
import { nextTick, reactive, computed } from 'vue';
const styles = reactive({
	fontSize: 16
})

/**
 * 文本存储数组
 */
const content = reactive([''])
/**
 *  光标换行及回车增、删除、光标跟随
 * @param ev 
 * @param index 当前元素下标
 */
const nextText= async (ev, index: number) => {
	const targetText = ev.target.innerText.split('/n').join('')
	const list = ev.target.parentNode?.getElementsByTagName('li')
    const selection = window.getSelection();  
    const caretPos = selection!.anchorOffset;  
	if (ev.key === 'Enter') {
		ev.preventDefault()
		if (!targetText || !targetText.length) return
		content.splice(index + 1, 0 , '')
		nextTick(() => {
            viewBottom(ev.target.parentNode, index + 1)
            switchFocus(list![index + 1], true)
		})
	} else if (ev.key === 'Backspace' && !targetText.length){
		if (content.length <= 1) return
		ev.preventDefault()
		content.splice(index, 1)
		nextTick(() => {
            if (index === 0) switchFocus(list![index], true)
            else switchFocus(list![index - 1], false)
		})
	} else if (ev.key ===  'ArrowUp' && caretPos === 0 && list![index - 1]) {
        switchFocus(list![index - 1], false)
    } else if(ev.key === 'ArrowDown' && caretPos === targetText.length && list![index + 1]) {
        switchFocus(list![index + 1], true)
    }
}

/**
 * 新增编辑的项是最后倒数前三滚动跳到最底，反之不操作
 * @param element 滚动元素
 * @param index 元素下标
 */
const viewBottom = (element, index: number) => {
    if (content.length - 4 < index)
    element.scrollTop = element.scrollHeight 
}
const changeText = (ev, index: number) => {
	// ev.preventDefault();
	content[index] = ev.target.innerText.split('/n').join('')
    viewBottom(ev.target.parentNode, index)
}

const total = computed(() => {
	let result = 0
	content.forEach((itme) => result += itme.length)
	return result + '字'
})

/**
 * 点击空白处焦点自动锁定最后项
 */
const liFocus = async (ev) => {
    if (ev.target.className !== 'text') return
    // const sss = window.getSelection()
    const list = ev.target.getElementsByTagName('li')
    switchFocus(list[list.length - 1], false)
}

/**
 * 
 * @param element 光标所在节点
 * @param type 设置为 false 将光标置于文本末尾，设置为 true 将光标置于文本开头  
 */
const switchFocus = (element: HTMLElement, type: boolean) => {
    const selection = window.getSelection();  
    const range = document.createRange();  
    range.selectNodeContents(element);  
    range.collapse(type);
    selection!.removeAllRanges();  
    selection!.addRange(range);  
}

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
        height: calc(100% - 20% - 20px);
        padding-bottom: 20%;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        li{
            display: block;
            width: 100%;
            white-space: normal;
            // word-wrap: break-word;
            // overflow-wrap: break-word; 
            text-indent: 2em;
            outline: none;
            border: none;
            margin-top: 10px;
        }
        li:focus{
            background-color: rgb(241, 241, 241);
        }
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
