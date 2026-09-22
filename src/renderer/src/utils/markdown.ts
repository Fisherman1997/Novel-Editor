// 助手回复的 Markdown 渲染
//
// 安全约定：html: false —— 模型输出中的原始 HTML 一律转义，只允许
// markdown-it 生成的标签；validateLink 拦截 javascript: 等危险协议。
// 用户消息不走此渲染，保持纯文本。

import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true
})

export function renderMarkdown(text: string): string {
    if (!text) return ''
    return md.render(text)
}
