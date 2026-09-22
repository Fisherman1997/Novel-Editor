<template>
    <div class="inline-edit" @dblclick="startEdit">
        <template v-if="isEditing">
            <input
                ref="inputRef"
                v-model="editValue"
                class="edit-input"
                @blur="confirmEdit"
                @keydown.enter="confirmEdit"
                @keydown.esc="cancelEdit"
            />
        </template>
        <template v-else>
            <span class="display-text" :class="{ 'is-empty': !value }" :title="title || undefined">
                {{ value || placeholder }}
            </span>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

interface Props {
    value: string
    placeholder?: string
    disabled?: boolean
    title?: string
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: '未命名',
    disabled: false,
    title: ''
})

const emit = defineEmits<{
    (e: 'change', value: string): void
}>()

const isEditing = ref(false)
const editValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

// 开始编辑
const startEdit = () => {
    if (props.disabled) return

    isEditing.value = true
    editValue.value = props.value

    nextTick(() => {
        inputRef.value?.focus()
        inputRef.value?.select()
    })
}

// 确认编辑
const confirmEdit = () => {
    if (!isEditing.value) return

    const newValue = editValue.value.trim()
    if (newValue !== props.value) {
        emit('change', newValue)
    }

    isEditing.value = false
}

// 取消编辑
const cancelEdit = () => {
    isEditing.value = false
    editValue.value = props.value
}

// 监听外部值变化
watch(
    () => props.value,
    (newVal) => {
        if (!isEditing.value) {
            editValue.value = newVal
        }
    }
)
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.inline-edit {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    max-width: 100%;

    .display-text {
        cursor: text;
        padding: 2px 6px;
        margin: 0 -6px;
        border-radius: @radius-sm;
        border-bottom: 1px dashed transparent;
        transition:
            background @transition-fast,
            border-color @transition-fast;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &:hover {
            background: var(--hover);
        }

        &.is-empty {
            color: var(--text-3);
            font-style: italic;
        }
    }

    .edit-input {
        flex: 1;
        min-width: 0;
        padding: 2px 6px;
        margin: 0 -6px;
        border: 1px solid var(--accent);
        border-radius: @radius-sm;
        outline: none;
        background: var(--bg-surface);
        color: var(--text-1);
        font-size: inherit;
        font-weight: inherit;
        font-family: inherit;
        box-shadow: 0 0 0 2px var(--accent-soft);
    }
}
</style>
