import { app, ipcMain, dialog } from 'electron'
import { join } from 'path'
import {
    writeFileSync,
    appendFileSync,
    existsSync,
    mkdirSync,
    statSync,
    renameSync,
    readFileSync
} from 'fs'

// 日志级别
export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

// 日志接口
interface LogEntry {
    timestamp: string
    level: LogLevel
    message: string
    context?: string
    stack?: string
    data?: any
}

// 日志管理器
class Logger {
    private logDir: string
    private logFile: string
    private maxLogSize = 10 * 1024 * 1024 // 10MB

    constructor() {
        this.logDir = join(app.getPath('userData'), 'logs')
        this.logFile = join(this.logDir, 'app.log')

        // 确保日志目录存在
        if (!existsSync(this.logDir)) {
            mkdirSync(this.logDir, { recursive: true })
        }
    }

    // 格式化日志条目
    private formatEntry(entry: LogEntry): string {
        const parts = [
            `[${entry.timestamp}]`,
            `[${entry.level}]`,
            entry.context ? `[${entry.context}]` : '',
            entry.message,
            entry.stack ? `\nStack: ${entry.stack}` : '',
            entry.data ? `\nData: ${JSON.stringify(entry.data, null, 2)}` : ''
        ]

        return parts.filter(Boolean).join(' ')
    }

    // 写入日志
    private write(entry: LogEntry): void {
        const formatted = this.formatEntry(entry) + '\n'

        try {
            if (existsSync(this.logFile)) {
                const stats = statSync(this.logFile)
                if (stats.size > this.maxLogSize) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
                    const backupFile = join(this.logDir, `app-${timestamp}.log`)
                    renameSync(this.logFile, backupFile)
                }
            }

            appendFileSync(this.logFile, formatted, 'utf-8')
        } catch (error) {
            console.error('写入日志失败:', error)
        }
    }

    // 创建日志条目
    private createEntry(level: LogLevel, message: string, context?: string, data?: any): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            data,
            stack: level === LogLevel.ERROR ? new Error().stack : undefined
        }
    }

    // DEBUG 日志
    debug(message: string, context?: string, data?: any): void {
        const entry = this.createEntry(LogLevel.DEBUG, message, context, data)
        this.write(entry)
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${context ? `[${context}] ` : ''}${message}`, data || '')
        }
    }

    // INFO 日志
    info(message: string, context?: string, data?: any): void {
        const entry = this.createEntry(LogLevel.INFO, message, context, data)
        this.write(entry)
        console.log(`[INFO] ${context ? `[${context}] ` : ''}${message}`, data || '')
    }

    // WARN 日志
    warn(message: string, context?: string, data?: any): void {
        const entry = this.createEntry(LogLevel.WARN, message, context, data)
        this.write(entry)
        console.warn(`[WARN] ${context ? `[${context}] ` : ''}${message}`, data || '')
    }

    // ERROR 日志
    error(message: string, context?: string, error?: Error | any, data?: any): void {
        const entry = this.createEntry(LogLevel.ERROR, message, context, data)
        if (error) {
            entry.stack = error.stack || String(error)
            entry.data = { ...entry.data, error: error.message || error }
        }
        this.write(entry)
        console.error(`[ERROR] ${context ? `[${context}] ` : ''}${message}`, error || '')
    }

    // 获取日志文件路径
    getLogPath(): string {
        return this.logFile
    }

    // 读取日志文件
    readLogs(limit = 100): string[] {
        try {
            if (!existsSync(this.logFile)) return []

            const content = readFileSync(this.logFile, 'utf-8')
            const lines = content.split('\n').filter((line) => line.trim())
            return lines.slice(-limit)
        } catch (error) {
            console.error('读取日志失败:', error)
            return []
        }
    }

    // 清空日志
    clearLogs(): void {
        try {
            if (existsSync(this.logFile)) {
                writeFileSync(this.logFile, '', 'utf-8')
            }
        } catch (error) {
            console.error('清空日志失败:', error)
        }
    }
}

// 单例实例
export const logger = new Logger()

// 设置主进程错误处理
export function setupMainProcessErrorHandling(): void {
    // 未捕获异常
    process.on('uncaughtException', (error) => {
        logger.error('未捕获异常', 'MainProcess', error)

        dialog.showErrorBox('应用错误', `应用遇到了一个错误，即将退出。\n\n${error.message}`)

        app.quit()
    })

    // 未处理的 Promise 拒绝
    process.on('unhandledRejection', (reason) => {
        logger.error('未处理的 Promise 拒绝', 'MainProcess', reason)
    })

    // 警告
    process.on('warning', (warning) => {
        logger.warn(warning.message, 'MainProcess', warning)
    })

    // 监听渲染进程错误
    ipcMain.on('renderer:error', (_event, error) => {
        logger.error('渲染进程错误', 'Renderer', error)
    })

    // 监听日志请求
    ipcMain.handle('log:read', (_event, limit?: number) => {
        return logger.readLogs(limit)
    })

    ipcMain.handle('log:clear', () => {
        logger.clearLogs()
    })

    ipcMain.handle('log:path', () => {
        return logger.getLogPath()
    })

    logger.info('主进程错误处理已设置')
}
