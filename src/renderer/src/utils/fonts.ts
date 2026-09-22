// 编辑器字体选项 → 实际 CSS 字体栈
// 兼容旧配置值（自定义宋体 / 自定义黑体）

const SERIF = `'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'SimSun', Georgia, serif`
const SANS = `'PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Segoe UI', system-ui, sans-serif`

const FONT_FAMILY_MAP: Record<string, string> = {
    默认: SANS,
    黑体: SANS,
    宋体: SERIF,
    自定义黑体: SANS,
    自定义宋体: SERIF
}

export function resolveFontFamily(value: string): string {
    return FONT_FAMILY_MAP[value] || SANS
}

// 设置面板中的字体选项（label 与存储值一致）
export const FONT_FAMILY_OPTIONS = [
    { label: '默认（无衬线）', value: '默认' },
    { label: '黑体', value: '黑体' },
    { label: '宋体', value: '宋体' }
]
