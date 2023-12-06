<template>
    <span v-if="!editState" @dblclick="handleDblClick">{{ props.name }}</span>
    <input 
        v-else
        ref="editRef"
        class="edit"  
        type="text" 
        :value="props.name" 
        @keyup.enter="handleEnter" 
        @keyup.esc="editState = false"
        @blur="editState = false">
</template>

<script lang="ts" setup>
import { ref, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
const editState = ref(false)
const editRef = ref()
const props = defineProps({
    name: String
})
const emits = defineEmits(['changeName'])
const handleDblClick = (ev: Event) => {
    ev.preventDefault()
    editState.value = true
    nextTick(() => {
        editRef.value.focus()
    })
}
const handleEnter = (ev) => {
    if(!ev.target.value.length) {
        ElMessage({
            type: 'warning',
            message: '内容不可为空'
        })
        return
    }
    emits('changeName', ev.target.value)
    editState.value = false
}

</script>

<style scoped lang="less">
.edit{
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
}
.edit:focus{
    border: none;
    outline: none;
    background-color: rgba(176, 230, 255, 0.5);
}
</style>