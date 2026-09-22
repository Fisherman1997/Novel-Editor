// AI 助手流式对话 composable
//
// 职责：单飞控制、消息收发、事件订阅生命周期、停止/错误定稿。
// 铁律：这里只读写会话消息（store 的 agent 字段），从不触碰 chapter.content。

import { ref, onUnmounted } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { ElMessage } from 'element-plus'
import { useNovelStore, useAgentConfigStore } from '../store'
import { buildMessages, MAX_USER_INPUT_CHARS } from '../utils/agentPrompt'
import type { AgentContextScope } from '@shared/types'

export interface UseAgentChatOptions {
    // 未配置时打开设置弹窗的回调（F2.4）
    onNeedConfig?: () => void
}

export function useAgentChat(options: UseAgentChatOptions = {}) {
    const novelStore = useNovelStore()
    const configStore = useAgentConfigStore()

    const isStreaming = ref(false)
    const streamError = ref<string | null>(null)

    let activeRequestId: string | null = null
    let activeSessionId: string | null = null
    let disposers: Array<() => void> = []
    let stoppedByUser = false

    const disposeListeners = () => {
        disposers.forEach((dispose) => {
            try {
                dispose()
            } catch {
                // 忽略重复清理
            }
        })
        disposers = []
    }

    const finishStream = (error?: string) => {
        disposeListeners()
        if (activeSessionId) {
            novelStore.finalizeAssistantMessage(activeSessionId, { error })
        }
        activeRequestId = null
        activeSessionId = null
        isStreaming.value = false
    }

    const subscribe = (requestId: string, sessionId: string) => {
        disposers.push(
            window.api.agent.onChunk((p) => {
                if (p.requestId !== requestId || activeRequestId !== requestId) return
                const session = novelStore.agent.sessions.find((s) => s.id === sessionId)
                const last = session?.messages[session.messages.length - 1]
                if (last?.role === 'assistant') {
                    novelStore.updateLastAssistantMessage(sessionId, last.content + p.delta)
                } else {
                    novelStore.updateLastAssistantMessage(sessionId, p.delta)
                }
            })
        )

        disposers.push(
            window.api.agent.onDone((p) => {
                if (p.requestId !== requestId || activeRequestId !== requestId) return
                streamError.value = null
                finishStream(undefined)
            })
        )

        disposers.push(
            window.api.agent.onError((p) => {
                if (p.requestId !== requestId || activeRequestId !== requestId) return
                streamError.value = p.error || '请求失败'
                finishStream(p.error || '请求失败')
            })
        )
    }

    // 发送一条消息（Enter 触发）；空输入/生成中直接忽略
    const sendMessage = async (text: string): Promise<boolean> => {
        const content = text.trim()
        if (!content) return false

        if (content.length > MAX_USER_INPUT_CHARS) {
            ElMessage.warning(
                `输入过长（${content.length} 字符），上限 ${MAX_USER_INPUT_CHARS} 字符`
            )
            return false
        }

        if (isStreaming.value) {
            ElMessage.warning('正在生成中，请先停止当前回复')
            return false
        }

        if (!configStore.isConfigured) {
            ElMessage.warning('请先在设置中填写 baseUrl 与 model')
            options.onNeedConfig?.()
            return false
        }

        streamError.value = null

        // 无会话则新建
        let sessionId = novelStore.agent.activeSessionId
        if (!sessionId || !novelStore.agent.sessions.some((s) => s.id === sessionId)) {
            sessionId = novelStore.createAgentSession()
        }

        // 首次发送时冻结上下文快照（F7.2）
        novelStore.ensureAgentContext(sessionId)
        const session = novelStore.agent.sessions.find((s) => s.id === sessionId)
        if (!session) return false

        novelStore.appendAgentMessage(sessionId, { role: 'user', content })
        novelStore.appendAgentMessage(sessionId, { role: 'assistant', content: '' })

        // 历史 = 新消息之前的对话（最后两条是刚追加的 user + 占位 assistant）；
        // 快照只通过 buildMessages 注入 system，不进历史
        const history = session.messages.slice(0, -2).map((m) => ({
            role: m.role,
            content: m.content
        }))

        const messages = buildMessages({
            snapshot: session.context ?? null,
            history,
            userText: content
        })

        const requestId = uuidv4()
        activeRequestId = requestId
        activeSessionId = sessionId
        isStreaming.value = true
        stoppedByUser = false
        subscribe(requestId, sessionId)

        try {
            const result = await window.api.agent.chat({
                requestId,
                baseUrl: configStore.baseUrl,
                apiKey: configStore.apiKey,
                model: configStore.model,
                temperature: configStore.temperature,
                maxTokens: configStore.maxTokens,
                messages
            })
            if (!result.ok) {
                finishStream(result.error || '请求发起失败')
                streamError.value = result.error || '请求发起失败'
                return false
            }
            return true
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            finishStream(message)
            streamError.value = message
            return false
        }
    }

    // 停止生成（F8.3）：中断请求，保留已生成内容并标记「已停止」
    const stopStreaming = () => {
        if (!isStreaming.value || !activeRequestId) return
        stoppedByUser = true
        const requestId = activeRequestId
        window.api.agent.abort(requestId)
        finishStream('已停止')
        ElMessage.info('已停止生成，内容已保留')
    }

    // 刷新上下文快照（F7.3）
    const refreshContext = () => {
        const sessionId = novelStore.agent.activeSessionId
        if (!sessionId) {
            ElMessage.warning('当前没有活动会话')
            return
        }
        novelStore.refreshAgentContext(sessionId)
        ElMessage.success('上下文已刷新')
    }

    // 切换上下文范围（F7.4）：已有快照失效，提示重捕获
    const changeScope = (scope: AgentContextScope) => {
        const sessionId = novelStore.agent.activeSessionId
        if (!sessionId) return
        novelStore.setAgentSessionScope(sessionId, scope)
        ElMessage.success('上下文范围已切换，下次发送时重新捕获')
    }

    onUnmounted(() => {
        if (isStreaming.value && activeRequestId) {
            window.api.agent.abort(activeRequestId)
            finishStream('已停止')
        } else {
            disposeListeners()
        }
    })

    return {
        isStreaming,
        streamError,
        stoppedByUser,
        sendMessage,
        stopStreaming,
        refreshContext,
        changeScope
    }
}
