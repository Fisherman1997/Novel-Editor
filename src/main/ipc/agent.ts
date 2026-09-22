import { ipcMain } from 'electron'
import {
    IPC_CHANNELS,
    AgentChatRequest,
    AgentStreamChunk,
    AgentStreamEnd
} from '../../shared/types'
import { logger } from '../logger'

// 一次 LLM 流式请求的超时（120s，见 AI-AGENT-PLAN.md §3）
const REQUEST_TIMEOUT_MS = 120_000

// 同一时刻在飞的请求：requestId → AbortController
const controllers = new Map<string, AbortController>()

interface ChatPayload extends AgentChatRequest {
    requestId: string
}

// URL 规范化：去尾部 /，已含 /chat/completions 不重复拼接
export function normalizeChatUrl(baseUrl: string): string {
    let url = (baseUrl || '').trim().replace(/\/+$/, '')
    if (!/\/chat\/completions$/i.test(url)) {
        url += '/chat/completions'
    }
    return url
}

function sendToSender(
    sender: Electron.WebContents,
    channel: string,
    payload: AgentStreamChunk | AgentStreamEnd
): void {
    if (!sender.isDestroyed()) {
        sender.send(channel, payload)
    }
}

function friendlyHttpError(status: number, statusText: string): string {
    if (status === 401 || status === 403) {
        return `认证失败（${status}）：请检查 apiKey 是否正确`
    }
    if (status === 404) {
        return `接口不存在（404）：请检查 baseUrl 是否指向 OpenAI 兼容服务`
    }
    if (status === 429) {
        return `请求过于频繁或额度不足（429）：请稍后重试`
    }
    if (status >= 500) {
        return `模型服务错误（${status}）：请稍后重试`
    }
    return `请求失败（${status}${statusText ? ' ' + statusText : ''}）`
}

// 解析 SSE 增量：按 data: 行处理，[DONE] 结束；返回 true 表示已收到结束信号
function handleSseLine(line: string, sender: Electron.WebContents, requestId: string): boolean {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return false

    const data = trimmed.slice(5).trim()
    if (!data) return false
    if (data === '[DONE]') return true

    try {
        const parsed = JSON.parse(data)
        const delta = parsed?.choices?.[0]?.delta?.content
        if (typeof delta === 'string' && delta.length > 0) {
            const chunk: AgentStreamChunk = { requestId, delta }
            sendToSender(sender, IPC_CHANNELS.AGENT_CHUNK, chunk)
        }
    } catch {
        // 忽略无法解析的 SSE 行（部分服务会发心跳/注释外的杂数据）
    }
    return false
}

async function runChat(sender: Electron.WebContents, payload: ChatPayload): Promise<void> {
    const { requestId } = payload
    const controller = new AbortController()
    controllers.set(requestId, controller)

    let timedOut = false
    const timeoutTimer = setTimeout(() => {
        timedOut = true
        controller.abort()
    }, REQUEST_TIMEOUT_MS)

    const cleanup = () => {
        clearTimeout(timeoutTimer)
        controllers.delete(requestId)
    }

    try {
        const url = normalizeChatUrl(payload.baseUrl)
        if (!payload.baseUrl || !payload.model || !Array.isArray(payload.messages)) {
            throw new Error('配置不完整：baseUrl、model、messages 均为必填')
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (payload.apiKey) {
            headers.Authorization = `Bearer ${payload.apiKey}`
        }

        // 绝不打印 apiKey / 请求体（含 key）
        logger.info('AI 助手请求开始', 'Agent', { url, model: payload.model })

        const response = await fetch(url, {
            method: 'POST',
            headers,
            signal: controller.signal,
            body: JSON.stringify({
                model: payload.model,
                messages: payload.messages,
                temperature: payload.temperature,
                max_tokens: payload.maxTokens,
                stream: true
            })
        })

        if (!response.ok) {
            const statusText = response.statusText || ''
            const error = friendlyHttpError(response.status, statusText)
            logger.warn('AI 助手请求失败', 'Agent', { status: response.status })
            sendToSender(sender, IPC_CHANNELS.AGENT_ERROR, { requestId, error })
            return
        }

        if (!response.body) {
            sendToSender(sender, IPC_CHANNELS.AGENT_ERROR, {
                requestId,
                error: '服务未返回流式响应体'
            })
            return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let receivedDone = false

        while (!receivedDone) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split(/\r?\n/)
            buffer = lines.pop() ?? ''

            for (const line of lines) {
                if (handleSseLine(line, sender, requestId)) {
                    receivedDone = true
                    break
                }
            }
        }

        // 残留的最后一行
        if (!receivedDone && buffer.trim()) {
            receivedDone = handleSseLine(buffer, sender, requestId)
        }

        if (timedOut) {
            sendToSender(sender, IPC_CHANNELS.AGENT_ERROR, {
                requestId,
                error: `请求超时（${REQUEST_TIMEOUT_MS / 1000}s）`
            })
            return
        }

        if (controller.signal.aborted) {
            // 用户主动停止：renderer 侧已自行定稿，这里仅补发结束事件兜底
            sendToSender(sender, IPC_CHANNELS.AGENT_DONE, { requestId })
            return
        }

        if (!receivedDone) {
            sendToSender(sender, IPC_CHANNELS.AGENT_ERROR, {
                requestId,
                error: '流式响应中断：连接提前结束'
            })
            return
        }

        sendToSender(sender, IPC_CHANNELS.AGENT_DONE, { requestId })
    } catch (error) {
        if (controller.signal.aborted) {
            if (timedOut) {
                sendToSender(sender, IPC_CHANNELS.AGENT_ERROR, {
                    requestId,
                    error: `请求超时（${REQUEST_TIMEOUT_MS / 1000}s）`
                })
            } else {
                sendToSender(sender, IPC_CHANNELS.AGENT_DONE, { requestId })
            }
            return
        }

        const message = error instanceof Error ? error.message : String(error)
        logger.warn('AI 助手请求异常', 'Agent', { message })
        sendToSender(sender, IPC_CHANNELS.AGENT_ERROR, {
            requestId,
            error: `网络错误：${message}`
        })
    } finally {
        cleanup()
    }
}

export function registerAgentHandlers(): void {
    // 发起流式对话（渲染 → 主进程 → SSE → chunk/done/error）
    ipcMain.handle(IPC_CHANNELS.AGENT_CHAT, (event, payload: ChatPayload) => {
        if (!payload || typeof payload.requestId !== 'string' || !payload.requestId) {
            return { ok: false, error: '缺少 requestId' }
        }
        if (controllers.has(payload.requestId)) {
            return { ok: false, error: '重复的 requestId：该请求已在进行中' }
        }

        void runChat(event.sender, payload)
        return { ok: true }
    })

    // 中止指定请求
    ipcMain.on(IPC_CHANNELS.AGENT_ABORT, (_event, requestId: string) => {
        const controller = controllers.get(requestId)
        if (controller) {
            controller.abort()
            logger.info('AI 助手请求已中止', 'Agent', { requestId })
        }
    })
}
