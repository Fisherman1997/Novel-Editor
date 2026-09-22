<template>
    <div class="agent-panel">
        <!-- 顶栏：会话管理 + 设置 -->
        <div class="panel-toolbar">
            <el-select
                class="session-select"
                :model-value="activeSessionId || undefined"
                placeholder="选择会话"
                :disabled="chat.isStreaming.value"
                @change="handleSelectSession"
            >
                <el-option
                    v-for="session in sessions"
                    :key="session.id"
                    :label="session.title"
                    :value="session.id"
                >
                    <span class="session-option">
                        <AppIcon v-if="session.pinned" name="pin" :size="11" class="pin-icon" />
                        <span class="session-option-title">{{ session.title }}</span>
                        <span v-if="session.id === activeSessionId" class="active-dot">当前</span>
                    </span>
                </el-option>
                <template #empty>
                    <div class="session-empty">暂无会话，点击 + 新建</div>
                </template>
            </el-select>

            <button class="icon-btn" title="新建会话" @click="handleCreateSession">
                <AppIcon name="plus" :size="14" />
            </button>
            <button
                class="icon-btn"
                title="重命名"
                :disabled="!activeSession"
                @click="handleRenameSession"
            >
                <AppIcon name="pencil" :size="13" />
            </button>
            <button
                class="icon-btn"
                :class="{ 'is-on': activeSession?.pinned }"
                title="置顶"
                :disabled="!activeSession"
                @click="handleTogglePin"
            >
                <AppIcon name="pin" :size="13" />
            </button>
            <button
                class="icon-btn is-danger"
                title="删除会话"
                :disabled="!activeSession || chat.isStreaming.value"
                @click="handleDeleteSession"
            >
                <AppIcon name="trash" :size="13" />
            </button>
            <button class="icon-btn" title="模型设置" @click="openSettings">
                <AppIcon name="settings" :size="13" />
            </button>
        </div>

        <!-- 上下文条：范围 + 快照状态 + 刷新 -->
        <div class="context-bar">
            <el-select
                class="scope-select"
                :model-value="activeSession?.contextScope ?? 'outline'"
                :disabled="!activeSession || chat.isStreaming.value"
                @change="handleScopeChange"
            >
                <el-option label="大纲" value="outline" />
                <el-option label="当前章" value="currentChapter" />
                <el-option label="全书" value="fullBook" />
            </el-select>

            <span class="context-status" :title="contextStatusTitle">
                <template v-if="activeSession?.context">
                    已捕获 · {{ formatTime(activeSession.context.capturedAt) }}
                    <span
                        v-if="activeSession.context.truncation?.truncated"
                        class="trunc-flag"
                        :title="`原 ${activeSession.context.truncation.originalChars} 字 → 保留 ${activeSession.context.truncation.keptChars} 字`"
                    >
                        已截断
                    </span>
                </template>
                <template v-else>上下文待捕获</template>
            </span>

            <button
                class="icon-btn"
                title="刷新上下文"
                :disabled="!activeSession || chat.isStreaming.value"
                @click="chat.refreshContext()"
            >
                <AppIcon name="refresh" :size="13" />
            </button>
        </div>

        <!-- 未配置引导（F2.4） -->
        <div v-if="!configStore.isConfigured" class="config-hint">
            <AppIcon name="sparkles" :size="14" />
            <span>尚未配置模型服务</span>
            <button class="hint-btn" @click="openSettings">打开设置</button>
        </div>

        <!-- 消息区 -->
        <div ref="messagesEl" class="messages">
            <div v-if="!activeSession || activeSession.messages.length === 0" class="empty-state">
                <AppIcon name="bot" :size="30" class="empty-icon" />
                <p>{{ activeSession ? '开始你的第一次提问吧' : '还没有会话' }}</p>
                <p class="hint">
                    {{
                        activeSession
                            ? 'AI 只提供书稿建议，采纳与否由你决定'
                            : '点击上方 + 新建会话'
                    }}
                </p>
            </div>

            <template v-else>
                <div
                    v-for="msg in activeSession.messages"
                    :key="msg.id"
                    class="message"
                    :class="`is-${msg.role}`"
                >
                    <div class="bubble">
                        <div class="bubble-content">
                            <span>{{ msg.content }}</span>
                            <span
                                v-if="isStreamingLast(msg)"
                                class="stream-cursor"
                                aria-hidden="true"
                            />
                        </div>
                        <div v-if="msg.error" class="msg-error">
                            <AppIcon name="alert-circle" :size="11" />
                            {{ msg.error }}
                        </div>
                        <button
                            v-if="msg.role === 'assistant' && msg.content && !isStreamingLast(msg)"
                            class="copy-btn"
                            title="复制全文"
                            @click="copyMessage(msg.content)"
                        >
                            <AppIcon name="copy" :size="11" />
                            复制
                        </button>
                    </div>
                </div>
            </template>
        </div>

        <!-- 快捷指令 chips（F5.5） -->
        <div class="quick-prompts">
            <button
                v-for="qp in QUICK_PROMPTS"
                :key="qp.id"
                class="chip"
                :disabled="chat.isStreaming.value"
                :title="qp.text"
                @click="applyQuickPrompt(qp)"
            >
                <AppIcon name="sparkles" :size="11" />
                {{ qp.label }}
            </button>
        </div>

        <!-- 输入区 -->
        <div class="input-area">
            <textarea
                ref="inputEl"
                v-model="input"
                class="input-box"
                rows="2"
                :placeholder="inputPlaceholder"
                :disabled="chat.isStreaming.value"
                @keydown.enter="handleEnter"
            />
            <button
                v-if="chat.isStreaming.value"
                class="send-btn is-stop"
                title="停止生成"
                @click="chat.stopStreaming()"
            >
                <AppIcon name="stop" :size="14" />
            </button>
            <button
                v-else
                class="send-btn"
                title="发送（Enter）"
                :disabled="!input.trim() || !activeSession"
                @click="handleSend"
            >
                <AppIcon name="send" :size="14" />
            </button>
        </div>

        <!-- 模型服务配置弹窗（F2） -->
        <el-dialog v-model="settingsVisible" title="模型服务设置" width="420px" append-to-body>
            <div class="settings-form">
                <div class="form-item">
                    <label>Base URL</label>
                    <el-input
                        v-model="settingsForm.baseUrl"
                        placeholder="https://api.openai.com/v1"
                        clearable
                    />
                    <p class="form-hint">兼容 OpenAI 风格 /chat/completions 接口（含 SSE 流式）</p>
                </div>
                <div class="form-item">
                    <label>API Key</label>
                    <el-input
                        v-model="settingsForm.apiKey"
                        type="password"
                        show-password
                        placeholder="sk-...（可留空，视服务要求）"
                        clearable
                    />
                </div>
                <div class="form-item">
                    <label>模型</label>
                    <el-input v-model="settingsForm.model" placeholder="如 gpt-4o-mini" clearable />
                </div>
                <div class="form-row">
                    <div class="form-item half">
                        <label>Temperature</label>
                        <el-input-number
                            v-model="settingsForm.temperature"
                            :min="0"
                            :max="2"
                            :step="0.1"
                            controls-position="right"
                            style="width: 100%"
                        />
                    </div>
                    <div class="form-item half">
                        <label>Max Tokens</label>
                        <el-input-number
                            v-model="settingsForm.maxTokens"
                            :min="64"
                            :max="200000"
                            :step="256"
                            controls-position="right"
                            style="width: 100%"
                        />
                    </div>
                </div>
                <p class="privacy-hint">
                    配置仅保存在本机
                    localStorage，不会写入书籍文件（.xstxt）；发送内容为所选上下文的纯文本快照。
                </p>
            </div>
            <template #footer>
                <button class="dialog-btn" @click="settingsVisible = false">取消</button>
                <button class="dialog-btn is-primary" @click="saveSettings">保存</button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useNovelStore, useAgentConfigStore } from '../../store'
import { useAgentChat } from '../../composables/useAgentChat'
import { QUICK_PROMPTS } from '../../utils/agentPrompt'
import { confirmAction, promptInput } from '../../utils/confirm'
import { getScopeLabel } from '../../utils/agentContext'
import type { AgentContextScope, AgentConfig, AgentMessage } from '@shared/types'
import AppIcon from '../common/AppIcon.vue'

const novelStore = useNovelStore()
const configStore = useAgentConfigStore()

const settingsVisible = ref(false)
const settingsForm = reactive<AgentConfig>({
    baseUrl: '',
    apiKey: '',
    model: '',
    temperature: 0.7,
    maxTokens: 2048
})

const chat = useAgentChat({
    onNeedConfig: () => openSettings()
})

const input = ref('')
const messagesEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)

const sessions = computed(() => novelStore.sortedAgentSessions)
const activeSessionId = computed(() => novelStore.agent.activeSessionId)
const activeSession = computed(
    () => novelStore.agent.sessions.find((s) => s.id === activeSessionId.value) ?? null
)

const inputPlaceholder = computed(() => {
    if (chat.isStreaming.value) return '正在生成…'
    if (!activeSession.value) return '新建会话后开始提问'
    return '输入问题…（Enter 发送，Shift+Enter 换行）'
})

const contextStatusTitle = computed(() => {
    const ctx = activeSession.value?.context
    if (!ctx) return '首次发送时自动捕获，或点击刷新按钮手动捕获'
    return `范围：${getScopeLabel(ctx.scope)} · 捕获于 ${new Date(ctx.capturedAt).toLocaleString()}`
})

// ---------- 会话操作 ----------

const handleSelectSession = (id: string) => {
    if (chat.isStreaming.value) {
        ElMessage.warning('生成中不能切换会话，请先停止')
        return
    }
    novelStore.selectAgentSession(id)
}

const handleCreateSession = () => {
    if (chat.isStreaming.value) {
        ElMessage.warning('生成中不能新建会话，请先停止')
        return
    }
    novelStore.createAgentSession(activeSession.value?.contextScope ?? 'outline')
}

const handleRenameSession = async () => {
    const session = activeSession.value
    if (!session) return
    const title = await promptInput('会话名称：', '重命名会话', session.title, {
        placeholder: '会话名称',
        inputPattern: /\S/,
        inputErrorMessage: '名称不能为空'
    })
    if (title !== null) {
        novelStore.renameAgentSession(session.id, title)
    }
}

const handleTogglePin = () => {
    if (activeSessionId.value) {
        novelStore.togglePinSession(activeSessionId.value)
    }
}

const handleDeleteSession = async () => {
    const session = activeSession.value
    if (!session) return
    const ok = await confirmAction(
        `确定删除会话「${session.title}」吗？消息记录将一并删除。`,
        '删除会话'
    )
    if (ok) {
        novelStore.deleteAgentSession(session.id)
    }
}

const handleScopeChange = (scope: unknown) => {
    if (chat.isStreaming.value) {
        ElMessage.warning('生成中不能切换上下文范围')
        return
    }
    chat.changeScope(scope as AgentContextScope)
}

// ---------- 发送 ----------

const handleSend = () => {
    const text = input.value
    if (!text.trim()) return
    void chat.sendMessage(text).then((ok) => {
        if (ok) input.value = ''
    })
}

const handleEnter = (e: KeyboardEvent) => {
    // 中文输入法组词期间的 Enter 交给 IME 确认，不发送也不拦截（F8.1）
    if (e.isComposing || e.keyCode === 229) return
    e.preventDefault()
    handleSend()
}

const applyQuickPrompt = (qp: (typeof QUICK_PROMPTS)[number]) => {
    input.value = qp.text
    nextTick(() => inputEl.value?.focus())
}

// ---------- 消息展示 ----------

const isStreamingLast = (msg: AgentMessage): boolean => {
    if (!chat.isStreaming.value || !activeSession.value) return false
    const messages = activeSession.value.messages
    return messages[messages.length - 1]?.id === msg.id && msg.role === 'assistant'
}

const copyMessage = async (content: string) => {
    try {
        await navigator.clipboard.writeText(content)
        ElMessage.success('已复制到剪贴板')
    } catch {
        ElMessage.error('复制失败，请手动选择文本复制')
    }
}

const formatTime = (ts: number): string => {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 新消息/流式更新时滚动到底部
watch(
    () => {
        const msgs = activeSession.value?.messages
        if (!msgs || msgs.length === 0) return 0
        return `${msgs.length}:${msgs[msgs.length - 1].content.length}`
    },
    () => {
        nextTick(() => {
            const el = messagesEl.value
            if (el) el.scrollTop = el.scrollHeight
        })
    }
)

// ---------- 设置 ----------

const openSettings = () => {
    settingsForm.baseUrl = configStore.baseUrl
    settingsForm.apiKey = configStore.apiKey
    settingsForm.model = configStore.model
    settingsForm.temperature = configStore.temperature
    settingsForm.maxTokens = configStore.maxTokens
    settingsVisible.value = true
}

const saveSettings = () => {
    configStore.updateConfig({
        baseUrl: settingsForm.baseUrl.trim(),
        apiKey: settingsForm.apiKey.trim(),
        model: settingsForm.model.trim(),
        temperature: settingsForm.temperature,
        maxTokens: settingsForm.maxTokens
    })
    settingsVisible.value = false
    ElMessage.success('配置已保存到本机')
}
</script>

<style scoped lang="less">
@import '../../styles/variables.less';

.agent-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

// ---------- 顶栏 ----------
.panel-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: @spacing-sm @spacing-md;
    border-bottom: 1px solid var(--border);

    .session-select {
        flex: 1;
        min-width: 0;
    }

    .icon-btn {
        flex-shrink: 0;
    }
}

.icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: @radius-md;
    background: transparent;
    color: var(--text-2);
    cursor: pointer;
    transition: all @transition-fast;

    &:hover:not(:disabled) {
        background: var(--hover);
        color: var(--text-1);
    }

    &.is-on {
        background: var(--accent-soft);
        color: var(--accent);
    }

    &.is-danger:hover:not(:disabled) {
        background: var(--danger-soft, rgba(220, 38, 38, 0.12));
        color: var(--danger, #dc2626);
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
}

// ---------- 上下文条 ----------
.context-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px @spacing-md;
    border-bottom: 1px solid var(--border);
    background: var(--bg-subtle);

    .scope-select {
        width: 92px;
        flex-shrink: 0;

        :deep(.el-select__wrapper) {
            height: 26px;
            min-height: 26px;
            font-size: @font-size-sm;
        }
    }

    .context-status {
        flex: 1;
        min-width: 0;
        font-size: @font-size-xs;
        color: var(--text-3);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .trunc-flag {
        display: inline-block;
        margin-left: 4px;
        padding: 0 4px;
        border-radius: @radius-full;
        background: rgba(245, 158, 11, 0.15);
        color: #d97706;
        font-size: 10px;
    }
}

// ---------- 未配置提示 ----------
.config-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px @spacing-md;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: @font-size-sm;

    span {
        flex: 1;
    }

    .hint-btn {
        border: none;
        background: var(--accent);
        color: var(--accent-contrast);
        border-radius: @radius-md;
        padding: 3px 8px;
        font-size: @font-size-xs;
        cursor: pointer;

        &:hover {
            opacity: 0.9;
        }
    }
}

// ---------- 消息区 ----------
.messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: @spacing-md;
    display: flex;
    flex-direction: column;
    gap: @spacing-md;
}

.empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--text-3);
    text-align: center;

    .empty-icon {
        opacity: 0.5;
        margin-bottom: 4px;
    }

    p {
        margin: 0;
        font-size: @font-size-base;
        color: var(--text-2);
    }

    .hint {
        font-size: @font-size-sm;
        color: var(--text-3);
    }
}

.message {
    display: flex;

    &.is-user {
        justify-content: flex-end;

        .bubble {
            background: var(--accent-soft);
            color: var(--text-1);
            border-bottom-right-radius: 2px;
        }
    }

    &.is-assistant {
        justify-content: flex-start;

        .bubble {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            color: var(--text-1);
            border-bottom-left-radius: 2px;
        }
    }
}

.bubble {
    max-width: 92%;
    padding: 8px 10px;
    border-radius: @radius-lg;
    font-size: @font-size-base;
    line-height: @line-height-normal;
    box-shadow: var(--shadow-sm);

    .bubble-content {
        white-space: pre-wrap;
        word-break: break-word;
    }

    .msg-error {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed var(--border);
        color: var(--danger, #dc2626);
        font-size: @font-size-sm;
    }

    .copy-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-top: 6px;
        padding: 2px 6px;
        border: none;
        border-radius: @radius-sm;
        background: transparent;
        color: var(--text-3);
        font-size: @font-size-xs;
        cursor: pointer;
        transition: all @transition-fast;

        &:hover {
            background: var(--hover);
            color: var(--accent);
        }
    }
}

.stream-cursor {
    display: inline-block;
    width: 7px;
    height: 1em;
    margin-left: 2px;
    vertical-align: text-bottom;
    background: var(--accent);
    animation: blink 1s step-end infinite;
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}

// ---------- 快捷指令 ----------
.quick-prompts {
    display: flex;
    gap: 6px;
    padding: 6px @spacing-md;
    overflow-x: auto;
    border-top: 1px solid var(--border);

    &::-webkit-scrollbar {
        height: 0;
    }

    .chip {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;
        padding: 3px 8px;
        border: 1px solid var(--border);
        border-radius: @radius-full;
        background: var(--bg-surface);
        color: var(--text-2);
        font-size: @font-size-xs;
        cursor: pointer;
        transition: all @transition-fast;

        &:hover:not(:disabled) {
            border-color: var(--accent);
            color: var(--accent);
            background: var(--accent-soft);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }
}

// ---------- 输入区 ----------
.input-area {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    padding: @spacing-sm @spacing-md @spacing-md;
    border-top: 1px solid var(--border);

    .input-box {
        flex: 1;
        min-width: 0;
        resize: none;
        padding: 7px 10px;
        border: 1px solid var(--border);
        border-radius: @radius-md;
        background: var(--bg-surface);
        color: var(--text-1);
        font-size: @font-size-base;
        font-family: inherit;
        line-height: @line-height-normal;
        outline: none;
        transition: border-color @transition-fast;

        &:focus {
            border-color: var(--accent);
        }

        &:disabled {
            opacity: 0.6;
        }

        &::placeholder {
            color: var(--text-3);
        }
    }

    .send-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: @radius-md;
        background: var(--accent);
        color: var(--accent-contrast);
        cursor: pointer;
        transition: all @transition-fast;
        flex-shrink: 0;

        &:hover:not(:disabled) {
            opacity: 0.9;
        }

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        &.is-stop {
            background: var(--danger, #dc2626);
            color: #fff;
        }
    }
}

// ---------- 设置弹窗 ----------
.settings-form {
    .form-item {
        margin-bottom: @spacing-md;

        label {
            display: block;
            font-size: @font-size-sm;
            font-weight: @font-weight-medium;
            color: var(--text-2);
            margin-bottom: @spacing-xs;
        }

        .form-hint {
            margin: 4px 0 0;
            font-size: @font-size-xs;
            color: var(--text-3);
        }
    }

    .form-row {
        display: flex;
        gap: @spacing-md;

        .half {
            flex: 1;
            min-width: 0;
        }
    }

    .privacy-hint {
        margin: @spacing-sm 0 0;
        padding: 8px 10px;
        border-radius: @radius-md;
        background: var(--bg-inset);
        font-size: @font-size-xs;
        color: var(--text-3);
        line-height: @line-height-normal;
    }
}

.dialog-btn {
    padding: 6px 14px;
    border: 1px solid var(--border);
    border-radius: @radius-md;
    background: var(--bg-surface);
    color: var(--text-1);
    font-size: @font-size-base;
    cursor: pointer;
    transition: all @transition-fast;

    &:hover {
        background: var(--hover);
    }

    &.is-primary {
        border-color: var(--accent);
        background: var(--accent);
        color: var(--accent-contrast);
        margin-left: 8px;

        &:hover {
            opacity: 0.9;
            background: var(--accent);
        }
    }
}

.session-option {
    display: inline-flex;
    align-items: center;
    gap: 4px;

    .pin-icon {
        color: var(--accent);
    }

    .session-option-title {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .active-dot {
        font-size: 10px;
        color: var(--accent);
    }
}

.session-empty {
    padding: 12px;
    text-align: center;
    font-size: @font-size-sm;
    color: var(--text-3);
}
</style>
