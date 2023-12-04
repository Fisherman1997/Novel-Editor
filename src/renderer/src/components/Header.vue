<template>
    <div class="head">
        <div class="title">
            小说编辑器
        </div>
        <div class="right">
            <button :style="{ 'transform': 'scaleX(0.5)' }" @click="changeWin('minimize')">一</button>
            <button :style="{'margin-left': '10px'}" @click="changeWin('close')">×</button>
        </div>
    </div>
</template>
<script setup lang="ts">

const changeWin = (type: string) => {
    const windowApi: any = window.api
    console.log(windowApi.changeWindow('isFullScreen'))
    windowApi.changeWindow(type)
}
</script>
<style scoped lang="less">
.head{
    padding: 0 15px;
    -webkit-app-region: drag;
    height: 30px;
    background-color: aliceblue;
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.5); 
    position: relative;
    z-index: 10000000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .title{
        user-select: none; 
        -webkit-app-region: no-drag;
    }
    .right {
        -webkit-app-region: no-drag;
        button{
            cursor: pointer;
            margin: 0 5px;
            background: none;
            border: none;
            font-size: 26px;
        }
        // button:fcous{
        //     border: none;
        //     outline: none;
        // }
    }
}
</style>