import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
    WindowAction,
    FileResult,
    ExportConfig,
    IPC_CHANNELS,
    AgentChatRequest,
    AgentStreamChunk,
    AgentStreamEnd
} from '../shared/types'

// API 接口定义
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

const api: Api = {
    // 文件操作
    readFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, path),

    writeFile: (path: string, data: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, path, data),

    selectFile: (defaultPath: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FILE_SELECT, defaultPath, 'file'),

    selectDirectory: (defaultPath: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FILE_SELECT, defaultPath, 'dir'),

    exportNovel: (config: ExportConfig) => ipcRenderer.invoke(IPC_CHANNELS.FILE_EXPORT, config),

    // 窗口控制
    windowControl: (action: WindowAction) => ipcRenderer.send(IPC_CHANNELS.WINDOW_CONTROL, action),

    // 系统
    getDesktopPath: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_DESKTOP_PATH),

    getStartupFile: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_STARTUP_FILE),

    // AI 助手（LLM 请求由主进程代理，渲染进程不直连外网）
    agent: {
        chat: (req: { requestId: string } & AgentChatRequest) =>
            ipcRenderer.invoke(IPC_CHANNELS.AGENT_CHAT, req),

        abort: (requestId: string) => {
            ipcRenderer.send(IPC_CHANNELS.AGENT_ABORT, requestId)
        },

        onChunk: (cb: (p: AgentStreamChunk) => void) => {
            const handler = (_e: Electron.IpcRendererEvent, p: AgentStreamChunk) => cb(p)
            ipcRenderer.on(IPC_CHANNELS.AGENT_CHUNK, handler)
            return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_CHUNK, handler)
        },

        onDone: (cb: (p: AgentStreamEnd) => void) => {
            const handler = (_e: Electron.IpcRendererEvent, p: AgentStreamEnd) => cb(p)
            ipcRenderer.on(IPC_CHANNELS.AGENT_DONE, handler)
            return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_DONE, handler)
        },

        onError: (cb: (p: AgentStreamEnd) => void) => {
            const handler = (_e: Electron.IpcRendererEvent, p: AgentStreamEnd) => cb(p)
            ipcRenderer.on(IPC_CHANNELS.AGENT_ERROR, handler)
            return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_ERROR, handler)
        }
    },

    // 事件监听
    onFileOpen: (callback: (path: string) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, path: string) => callback(path)
        ipcRenderer.on(IPC_CHANNELS.FILE_OPEN, handler)
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.FILE_OPEN, handler)
        }
    },

    // 渲染进程错误上报（发送到主进程 logger 写入日志文件）
    reportError: (message: string, stack?: string, info?: string) => {
        ipcRenderer.send('renderer:error', { message, stack, info })
    },

    // 日志操作
    readLogs: () => ipcRenderer.invoke('log:read'),
    clearLogs: () => ipcRenderer.invoke('log:clear'),
    getLogPath: () => ipcRenderer.invoke('log:path')
}

// 暴露 API 到渲染进程
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error('暴露API失败:', error)
    }
} else {
    // @ts-ignore (在 d.ts 中定义)
    window.electron = electronAPI
    // @ts-ignore (在 d.ts 中定义)
    window.api = api
}
