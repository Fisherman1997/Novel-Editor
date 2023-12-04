<template>
    <div class="content" >
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
// import { nextCxecute } from '../utils/common'
const styles = reactive({
	fontSize: 16
})

/**
 * 文本存储数组
 */
const content = reactive([''])

const selectList = reactive<number[]>([])
/**
onMounted(() => {
    document.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Shift') return
        const target = ev.target as HTMLElement
        target.addEventListener('mousedown', changeSelect)
        document.onmouseup = () => {
            target.removeEventListener('mousedown', changeSelect)
            document.onmouseup = null
        }
    })
})
const changeSelect = (ev) => {
    const target = ev.target as HTMLElement
    if (target.className !== 'text' || (<HTMLElement>target.parentNode).className !== 'text') return
    const div = document.createElement('div')
    const setX = ev.clientX
    const setY = ev.clientY
    div.style.backgroundColor = 'rgba(77,133,255,0.3)'
    div.style.border = '1px solid rgb(77,133,255)'
    div.style.position = 'fixed'
    div.style.top = setY + 'px'
    div.style.left = setX + 'px'
    div.style.zIndex = '10000000'
    document.querySelector('#app .main .content .text')!.appendChild(div)
    const move = async (event) => {
        const X = event.clientX - setX
        const Y = event.clientY - setY
        if (Y < 0 && X > 0) div.style.top = event.clientY + 'px'
        if (Y < 0 && X < 0) {
            div.style.left = event.clientX + 'px'
            div.style.top = event.clientY + 'px'
        }
        if (X < 0 && Y > 0) div.style.left = event.clientX + 'px'
        div.style.width = (X < 0 ? Math.abs(X) : X) + 'px'
        div.style.height = (Y < 0 ? Math.abs(Y) : Y) + 'px'
        await nextCxecute()
    }
    const mouseup = () => {
        div.remove()
        document.removeEventListener('mousemove',move)
        document.removeEventListener('mouseup',mouseup)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', mouseup)
    
}
*/

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
        let createIndex = index + 1
        if (caretPos !== targetText.length && caretPos > 0) {
            content.splice(createIndex, 0 , content[index].substring(caretPos))
            content[index] = content[index].substring(0, caretPos)
        } 
        else if (caretPos === 0) {
            createIndex = index
            content.splice(createIndex, 0 , '')
        } 
        else content.splice(createIndex, 0 , '')
		nextTick(() => {
            viewBottom(ev.target.parentNode, createIndex)
            switchFocus(list![createIndex], true)
		})
	} else if (ev.key === 'Backspace' && caretPos === 0){
		if (content.length <= 1) return
        if (!index && content[index].length) return
		ev.preventDefault()
        if (content[index].length) content[index - 1] += content[index]
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
    selectList.splice(0, selectList.length)
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
