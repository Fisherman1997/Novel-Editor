import { registerFileHandlers } from './file'
import { registerWindowHandlers } from './window'
import { registerSystemHandlers, sendFileOpenEvent } from './system'
import { registerAgentHandlers } from './agent'

export { sendFileOpenEvent }

export function registerAllHandlers(): void {
    registerFileHandlers()
    registerWindowHandlers()
    registerSystemHandlers()
    registerAgentHandlers()

    console.log('所有IPC处理器已注册')
}
