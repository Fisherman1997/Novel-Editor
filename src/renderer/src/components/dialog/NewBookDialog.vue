<template>
  <el-dialog
    :model-value="visible"
    title="新建作品"
    width="440px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
    @closed="resetForm"
  >
    <div class="new-book-form">
      <div class="form-item">
        <label>书名</label>
        <el-input
          ref="nameInputRef"
          v-model="bookName"
          placeholder="为你的新书起个名字"
          maxlength="50"
          @keydown.enter="confirm"
        />
      </div>
      <div class="form-item">
        <label>保存位置</label>
        <div class="path-row">
          <el-input v-model="bookPath" placeholder="选择保存目录" readonly>
            <template #prefix>
              <AppIcon name="folder-open" :size="14" />
            </template>
          </el-input>
          <el-button @click="selectPath">浏览</el-button>
        </div>
        <p v-if="bookPath" class="path-hint">{{ bookPath }}</p>
      </div>
    </div>

    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :disabled="!canCreate" @click="confirm">
        创建并开始写作
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useMainStore } from '../../store'
import { useFileActions } from '../../composables'
import AppIcon from '../common/AppIcon.vue'

interface Props {
  visible: boolean
}

withDefaults(defineProps<Props>(), {
  visible: false
})
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const mainStore = useMainStore()
const { createNewBook } = useFileActions()

const bookName = ref('')
const bookPath = ref('')
const nameInputRef = ref()

const canCreate = computed(() => !!bookName.value.trim() && !!bookPath.value)

const resetForm = () => {
  bookName.value = ''
  bookPath.value = ''
}

const selectPath = async () => {
  const result = await window.api.selectDirectory(mainStore.recentFiles[0] || '')
  if (result.success && result.data) {
    bookPath.value = result.data
  }
}

const confirm = async () => {
  if (!canCreate.value) return
  const success = await createNewBook(bookName.value.trim(), bookPath.value)
  if (success) {
    emit('update:visible', false)
  }
}

// 打开时聚焦书名输入框
defineExpose({
  focusName: () => {
    nextTick(() => nameInputRef.value?.focus?.())
  }
})
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.new-book-form {
  .form-item {
    margin-bottom: @spacing-lg;

    &:last-child {
      margin-bottom: 0;
    }

    label {
      display: block;
      margin-bottom: @spacing-sm;
      font-size: @font-size-base;
      font-weight: @font-weight-medium;
      color: var(--text-1);
    }

    .path-row {
      display: flex;
      gap: @spacing-sm;

      .el-input {
        flex: 1;
      }
    }

    .path-hint {
      margin-top: @spacing-xs;
      font-size: @font-size-sm;
      color: var(--text-3);
      word-break: break-all;
    }
  }
}
</style>
