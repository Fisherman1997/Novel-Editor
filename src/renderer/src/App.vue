<template>
	<div class="main">
		<div class="left">
			<p>{{ currentInfo.character }}</p>
		</div>
		<Content />
		<div class="right">
			123
		</div>
	</div>
</template>
<script setup lang="ts">
import { reactive } from 'vue';
import { CurrentInfo } from './utils/types'
import Content from './components/Content.vue';

const currentInfo = reactive(new CurrentInfo('新书'))
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
