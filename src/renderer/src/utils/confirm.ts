import { ElMessageBox } from 'element-plus'

// 统一的确认弹窗（替代原生 confirm）
export async function confirmAction(
  message: string,
  title = '确认操作',
  options: {
    confirmButtonText?: string
    cancelButtonText?: string
    type?: 'warning' | 'info' | 'error'
  } = {}
): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, title, {
      confirmButtonText: options.confirmButtonText || '确定',
      cancelButtonText: options.cancelButtonText || '取消',
      type: options.type || 'warning'
    })
    return true
  } catch {
    return false
  }
}

// 统一的文本输入弹窗（替代原生 prompt），返回 null 表示取消
export async function promptInput(
  message: string,
  title = '请输入',
  initialValue = '',
  options: {
    placeholder?: string
    inputPattern?: RegExp
    inputErrorMessage?: string
  } = {}
): Promise<string | null> {
  try {
    const { value } = await ElMessageBox.prompt(message, title, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: initialValue,
      inputPlaceholder: options.placeholder,
      inputPattern: options.inputPattern,
      inputErrorMessage: options.inputErrorMessage
    })
    return value
  } catch {
    return null
  }
}
