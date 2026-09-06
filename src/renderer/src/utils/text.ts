// 文本统计工具（编辑器状态栏与全书字数共用同一口径）

// 统计字数：中文按字符计数，英文按单词计数
export function countWords(text: string): number {
  if (!text) return 0
  const chineseChars = (text.match(/[一-龥]/g) || []).length
  const englishWords = text
    .replace(/[一-龥]/g, ' ')
    .split(/\s+/)
    .filter(word => /[A-Za-z0-9]/.test(word)).length
  return chineseChars + englishWords
}

// HTML 实体反转义（覆盖正文常见实体，满足统计口径即可）
const NAMED_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'"
}

// 轻量去除 HTML 标签（不经过 DOM，供侧栏批量统计使用）
export function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => {
      const num = Number(code)
      return num > 0 && num < 0x10ffff ? String.fromCodePoint(num) : ' '
    })
    .replace(/&[a-zA-Z#0-9]+;/g, (m) => NAMED_ENTITIES[m] ?? ' ')
}

// 统计 HTML 内容字数（轻量实现，适合目录树 / 全书统计的批量调用）
export function countWordsInHtml(html: string): number {
  if (!html) return 0
  return countWords(stripHtml(html))
}

// 字数展示：过万显示「x.x 万」，否则千分位
export function formatWordCount(count: number): string {
  if (count >= 100000) {
    return `${(count / 10000).toFixed(1)} 万`
  }
  return count.toLocaleString('zh-CN')
}
