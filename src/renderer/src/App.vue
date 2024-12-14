<template>
  <Header></Header>
  <div class="main">
    <LeftNav ref="leftNav" />
    <Content />
    <Right />
  </div>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Header from './components/Header.vue'
import Content from './components/Content.vue'
import LeftNav from './components/LeftNav.vue'
import Right from './components/Right.vue'

const leftNav = ref()
/**
 * 全局快捷键
 * @param event
 */
const shortcut = (event) => {
  if (event.ctrlKey && event.key === 's') {
    leftNav.value.save()
  } else if (event.ctrlKey && event.key === 'n') {
    leftNav.value.openInsert()
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
.main {
  width: 100vw;
  height: calc(100vh - 30px);
  overflow: hidden;
  display: flex;
  justify-content: center;
}
</style>
