import { ElectronAPI } from '@electron-toolkit/preload'
import {
    WindowAction,
    FileResult,
    ExportConfig,
    AgentChatRequest,
    AgentStreamChunk,
    AgentStreamEnd
} from '../shared/types'

interface Api {
    // 文件操作
    readFile: (path: string) => Promise<FileResult>
    writeFile: (path: string, data: string) => Promise<FileResult>
    selectFile: (defaultPath: string) => Promise<FileResult>
    selectDirectory: (defaultPath: string) => Promise<FileResult>
    exportNovel: (config: ExportConfig) => Promise<FileResult>

    // 窗口控制
    windowControl: (action: WindowAction) => void

    // 系统
    getDesktopPath: () => Promise<string>
    getStartupFile: () => Promise<string | null>

    // AI 助手
    agent: {
        chat: (
            req: { requestId: string } & AgentChatRequest
        ) => Promise<{ ok: boolean; error?: string }>
        abort: (requestId: string) => void
        onChunk: (cb: (p: AgentStreamChunk) => void) => () => void
        onDone: (cb: (p: AgentStreamEnd) => void) => () => void
        onError: (cb: (p: AgentStreamEnd) => void) => () => void
    }

    // 事件监听
    onFileOpen: (callback: (path: string) => void) => () => void

    // 渲染进程错误上报
    reportError: (message: string, stack?: string, info?: string) => void

    // 日志
    readLogs: () => Promise<string>
    clearLogs: () => Promise<void>
    getLogPath: () => Promise<string>
}

declare global {
    interface Window {
        electron: ElectronAPI
        api: Api
    }
}

export {}
