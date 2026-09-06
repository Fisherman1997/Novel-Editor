import { registerFileHandlers } from './file'
import { registerWindowHandlers } from './window'
import { registerSystemHandlers, sendFileOpenEvent } from './system'

export { sendFileOpenEvent }

export function registerAllHandlers(): void {
  registerFileHandlers()
  registerWindowHandlers()
  registerSystemHandlers()

  console.log('所有IPC处理器已注册')
}
