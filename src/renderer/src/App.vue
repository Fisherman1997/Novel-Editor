<template>
	<Header></Header>
	<div class="main">
		<LeftNav ref="leftNav"/>
		<Content />
		<Right />
	</div>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Header from './components/Header.vue';
import Content from './components/Content.vue';
import LeftNav from './components/leftNav.vue';
import Right from './components/Right.vue';

const leftNav = ref()
// const { proxy } = getCurrentInstance()
const shortcut = (event) => {
	// const $refs = instance!.appContext.config.globalProperties.$refs;
	if (event.ctrlKey && event.key === 's') {
		
	} else if (event.ctrlKey && event.key === 'n'){
		// console.log(leftNav.value!.openValue)
		leftNav.value!.open()
	}
}

onMounted(() => {
	document.addEventListener('keydown', shortcut)
	// leftNav.value!.opne()
})
onBeforeUnmount(() => {
	document.removeEventListener('keydown', shortcut)
})
</script>

<style lang="less">
@import './assets/css/styles.less';
.main{
	width: 100vw;
	height: calc(100vh - 30px);
	overflow: hidden;
	display: flex;
	justify-content: center;
}
</style>
