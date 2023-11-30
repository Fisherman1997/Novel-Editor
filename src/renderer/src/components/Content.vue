<template>
    <div class="content">
        <ul @click="liFocus">
            <li 
                v-for="(text,index) in content"	
                contenteditable="true" 
                :style="{ fontSize: styles.fontSize + 'px' }"
                @input="(ev) => changeText(ev, index)"
                @keydown="(ev) => nextText(ev, index)">{{text}}</li>
        </ul>
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
const content = reactive([''])
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
            switchFocus(list![index + 1], true)
		})
	} else if (ev.key === 'Backspace' && !targetText.length){
		if (content.length <= 1) return
		content.splice(index, 1)
		nextTick(() => {
            switchFocus(list![index - 1], false)
            // selection?.setPosition(list![index - 1], list![index - 1].innerText.length)
		})
	} else if (ev.key ===  'ArrowUp' && caretPos === 0 && list![index - 1]) {
        switchFocus(list![index - 1], false)
    } else if(ev.key === 'ArrowDown' && caretPos === targetText.length && list![index + 1]) {
        switchFocus(list![index + 1], true)
    }
}
const changeText = (ev, index: number) => {
	// ev.preventDefault();
	const targetText = ev.target.innerText.split('/n').join('')
	content[index] = targetText.split('/n').join('')
}

const total = computed(() => {
	let result = 0
	content.forEach((itme) => result += itme.length)
	return result + '字'
})

const liFocus = async (ev) => {
    if (ev.target.nodeName !== 'UL') return
    // const sss = window.getSelection()
    const list = ev.target.getElementsByTagName('li')
    switchFocus(list[list.length - 1], false)
}


const switchFocus = (element: HTMLElement, type: boolean) => {
    const selection = window.getSelection();  
    const range = document.createRange();  
    // 设置光标位置到文本末尾  
    range.selectNodeContents(element);  
    range.collapse(type); // 设置为 false 将光标置于文本末尾，设置为 true 将光标置于文本开头  
    selection!.removeAllRanges();  
    selection!.addRange(range);  
}

const Jump = (url) => {
    (window.api! as any).newWin(url)
}
</script>

<style lang="less" scoped>
.content{
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
    position: relative;
    background-color: #f0fff9;
    width: 60%;
    // height: 100%;
    font-family: '小米兰亭', '微软雅黑';
    overflow: hidden;
    padding: 10px 10px 40px 10px;
    ul {
        height: 100%;
        overflow-y: auto;
    }
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
