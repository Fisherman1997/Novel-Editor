import { App } from 'vue'

// 全局错误处理器
export function setupErrorHandler(app: App): void {
    // Vue 组件错误处理
    app.config.errorHandler = (err, instance, info) => {
        console.error('[Vue Error]', err)
        console.error('[Component]', instance?.$options.name || 'Unknown')
        console.error('[Info]', info)

        if (import.meta.env.DEV) {
            console.error('[Stack]', (err as Error).stack)
        }

        // 上报到主进程日志
        reportError(err, instance, info)
    }

    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[Unhandled Rejection]', event.reason)
        window.api?.reportError(
            `UnhandledRejection: ${event.reason}`,
            event.reason?.stack,
            'unhandledrejection'
        )
        event.preventDefault()
    })

    // 捕获全局错误
    window.addEventListener('error', (event) => {
        console.error('[Global Error]', event.error)
        window.api?.reportError(
            `GlobalError: ${event.error?.message || event.message}`,
            event.error?.stack,
            'global-error'
        )
        event.preventDefault()
    })
}

// 错误上报到主进程 logger
export function reportError(err: unknown, instance: unknown, info: string): void {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    const component = (instance as any)?.$options?.name || undefined
    const detail = component ? `${info} [${component}]` : info

    try {
        window.api?.reportError(message, stack, detail)
    } catch {
        // 静默失败
    }
}

export function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message
    if (typeof err === 'string') return err
    return '发生未知错误'
}

export async function showError(message: string): Promise<void> {
    try {
        const { ElMessage } = await import('element-plus')
        ElMessage.error(message)
    } catch {
        alert(message)
    }
}

export async function showSuccess(message: string): Promise<void> {
    try {
        const { ElMessage } = await import('element-plus')
        ElMessage.success(message)
    } catch {
        console.log(message)
    }
}

export async function showWarning(message: string): Promise<void> {
    try {
        const { ElMessage } = await import('element-plus')
        ElMessage.warning(message)
    } catch {
        console.warn(message)
    }
}
