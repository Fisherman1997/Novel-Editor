<template>
	<div class="main">
		<div class="left">
			123
		</div>
		<Content />
		<div class="right">
			123
		</div>
	</div>
</template>
<script setup lang="ts">
import Content from './components/Content.vue';
</script>

<style lang="less">
@import './assets/css/styles.less';
.main{
	width: 100vw;
	height: 100vh;
	overflow: hidden;
	display: flex;
	justify-content: center;
	> .left{
		width: 20%;
		height: 100%;
	}
	> .right{
		width: 20%;
		height: 100%;
	}
}
</style>
