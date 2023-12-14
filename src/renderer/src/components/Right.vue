<template>
    <div class="right" :style="{ width: mainState.rightWidth + '%' }">
        <el-tabs v-model="activeName" class="demo-tabs"  type="border-card">
            <el-tab-pane label="设定" name="second">
                <RightContent :table-data="fileState.worldView" :type="'world'" />
            </el-tab-pane>
            <el-tab-pane label="人物" name="first">
                <RightContent :table-data="fileState.character" :type="'character'" />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { mainStore } from '@renderer/store/store.main'; 
import { fileStore } from '@renderer/store/store.file';
import RightContent from './module/RightContent.vue';
const activeName = ref('second')

const mainState = mainStore()
const fileState = fileStore()


</script>
<style scoped lang="less">
.right{
    // padding: 15px;
    height: 100%;
    .demo-tabs{
        height: 100%;
        .el-tabs__content{
            padding: 0 !important;
            height: 95%;
            .el-tab-pane{
                height: 100%;
            }
        }
    }
}
</style>