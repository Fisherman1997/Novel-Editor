<template>
  <el-dialog
    v-model="visible"
    title="导出小说"
    width="520px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="export-dialog">
      <div class="export-section">
        <label>导出范围</label>
        <el-radio-group v-model="exportType" size="small">
          <el-radio-button label="all">全书导出</el-radio-button>
          <el-radio-button label="volume">按卷导出</el-radio-button>
          <el-radio-button label="chapter">按章导出</el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="exportType === 'volume'" class="export-section">
        <label>选择卷</label>
        <el-select v-model="selectedVolumeIndex" placeholder="请选择卷" style="width: 100%">
          <el-option
            v-for="(volume, index) in volumes"
            :key="index"
            :label="volume.volumeName"
            :value="index"
          />
        </el-select>
      </div>

      <div v-if="exportType === 'chapter'" class="export-section">
        <label>选择章节</label>
        <div class="chapter-selector">
          <el-select
            v-model="selectedVolumeIndex"
            placeholder="选择卷"
            style="width: 45%"
            @change="selectedChapterIndex = 0"
          >
            <el-option
              v-for="(volume, index) in volumes"
              :key="index"
              :label="volume.volumeName"
              :value="index"
            />
          </el-select>
          <el-select
            v-model="selectedChapterIndex"
            placeholder="选择章"
            style="width: 55%"
          >
            <el-option
              v-for="(chapter, index) in currentVolumeChapters"
              :key="index"
              :label="chapter.chapterName"
              :value="index"
            />
          </el-select>
        </div>
      </div>

      <div class="export-section">
        <label>导出路径</label>
        <div class="path-input">
          <el-input v-model="exportPath" placeholder="选择导出目录" readonly>
            <template #prefix>
              <AppIcon name="folder-open" :size="14" />
            </template>
          </el-input>
          <el-button @click="selectPath">浏览</el-button>
        </div>
      </div>

      <div class="export-section">
        <label>导出选项</label>
        <div class="export-options">
          <el-switch v-model="includeSummary" active-text="包含卷/章说明" />
          <el-switch v-model="convertToPlainText" active-text="转换为纯文本" />
        </div>
      </div>

      <div class="export-preview">
        <div class="preview-title">
          <AppIcon name="book-open" :size="14" />
          导出预览
        </div>
        <div class="preview-content">
          <template v-if="exportType === 'all'">
            <span>导出范围：全书</span>
            <span>人物：{{ characters.length }} 个</span>
            <span>设定：{{ worldViews.length }} 个</span>
            <span>卷数：{{ volumes.length }} 卷</span>
            <span>总章数：{{ totalChapters }} 章</span>
          </template>
          <template v-else-if="exportType === 'volume' && selectedVolume">
            <span>导出范围：{{ selectedVolume.volumeName }}</span>
            <span>章节：{{ selectedVolume.chapters.length }} 章</span>
            <span v-if="selectedVolume.volumeSummary && includeSummary">
              卷说明：{{ selectedVolume.volumeSummary.substring(0, 60) }}…
            </span>
          </template>
          <template v-else-if="exportType === 'chapter' && selectedChapter">
            <span>导出范围：{{ selectedChapter.chapterName }}</span>
            <span>内容长度：{{ selectedChapter.content.length }} 字符</span>
            <span v-if="selectedChapter.chapterSummary && includeSummary">
              章说明：{{ selectedChapter.chapterSummary.substring(0, 60) }}…
            </span>
          </template>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :disabled="!canExport" @click="handleExport">
          开始导出
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRaw } from 'vue'
import { useMainStore, useNovelStore } from '../../store'
import { ExportType, ExportConfig } from '@shared/types'
import { showSuccess, showError } from '../../utils/errorHandler'
import AppIcon from '../common/AppIcon.vue'

const mainStore = useMainStore()
const novelStore = useNovelStore()

const visible = ref(true)

const exportType = ref<ExportType>('all')
const exportPath = ref('')
const selectedVolumeIndex = ref(0)
const selectedChapterIndex = ref(0)
const includeSummary = ref(true)
const convertToPlainText = ref(true)

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 卷列表
const volumes = computed(() => novelStore.volumes)

// 人物列表
const characters = computed(() => novelStore.characters)

// 世界观列表
const worldViews = computed(() => novelStore.worldViews)

// 当前选中卷
const selectedVolume = computed(() => {
  if (exportType.value === 'volume') {
    return volumes.value[selectedVolumeIndex.value] || null
  }
  return null
})

// 当前选中卷的章节列表
const currentVolumeChapters = computed(() => {
  if (exportType.value === 'chapter') {
    return volumes.value[selectedVolumeIndex.value]?.chapters || []
  }
  return []
})

// 当前选中章节
const selectedChapter = computed(() => {
  if (exportType.value === 'chapter') {
    return currentVolumeChapters.value[selectedChapterIndex.value] || null
  }
  return null
})

// 总章数
const totalChapters = computed(() => {
  return volumes.value.reduce((sum, vol) => sum + vol.chapters.length, 0)
})

// 是否可以导出
const canExport = computed(() => {
  if (!exportPath.value) return false

  if (exportType.value === 'volume' && selectedVolumeIndex.value === undefined) {
    return false
  }

  if (exportType.value === 'chapter') {
    if (selectedVolumeIndex.value === undefined || selectedChapterIndex.value === undefined) {
      return false
    }
  }

  return true
})

// 选择导出路径
const selectPath = async () => {
  const result = await window.api.selectDirectory(mainStore.recentFiles[0] || '')
  if (result.success && result.data) {
    exportPath.value = result.data
  }
}

// 执行导出
const handleExport = async () => {
  if (!canExport.value) return

  const config: ExportConfig = {
    type: exportType.value,
    path: exportPath.value,
    data: {
      name: novelStore.name,
      volumes: toRaw(novelStore.volumes),
      characters: toRaw(novelStore.characters),
      worldViews: toRaw(novelStore.worldViews)
    },
    volumeIndex: selectedVolumeIndex.value,
    chapterIndex: selectedChapterIndex.value,
    includeSummary: includeSummary.value,
    convertToPlainText: convertToPlainText.value
  }

  try {
    const result = await window.api.exportNovel(config)

    if (result?.success) {
      showSuccess('导出成功！')
      handleClose()
    } else {
      const message = result?.error || '导出未返回成功状态'
      console.error('导出失败:', message)
      showError('导出失败: ' + message)
    }
  } catch (error) {
    console.error('导出异常:', error)
    showError('导出失败: ' + ((error as Error)?.message || String(error)))
  }
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  emit('close')
}

// 监听导出类型变化，重置选择
watch(exportType, () => {
  selectedVolumeIndex.value = 0
  selectedChapterIndex.value = 0
})
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.export-dialog {
  display: flex;
  flex-direction: column;
  gap: @spacing-xl;
}

.export-section {
  display: flex;
  flex-direction: column;
  gap: @spacing-sm;

  label {
    font-size: @font-size-base;
    font-weight: @font-weight-medium;
    color: var(--text-1);
  }

  .path-input {
    display: flex;
    gap: @spacing-sm;

    .el-input {
      flex: 1;
    }
  }

  .chapter-selector {
    display: flex;
    gap: @spacing-sm;
  }

  .export-options {
    display: flex;
    flex-direction: column;
    gap: @spacing-md;
    padding: @spacing-md;
    border: 1px solid var(--border);
    border-radius: @radius-lg;
    background: var(--bg-inset);
  }
}

.export-preview {
  border: 1px solid var(--border);
  border-radius: @radius-lg;
  padding: @spacing-lg;
  background: var(--bg-surface);

  .preview-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: @spacing-md;
    font-size: @font-size-base;
    font-weight: @font-weight-semibold;
    color: var(--text-1);
  }

  .preview-content {
    display: flex;
    flex-direction: column;
    gap: 6px;

    span {
      font-size: @font-size-base;
      color: var(--text-2);
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: @spacing-sm;
}
</style>
