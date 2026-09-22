import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../../../src/renderer/src/utils/markdown'

describe('markdown', () => {
    it('渲染加粗与斜体', () => {
        const html = renderMarkdown('这是 **重点** 与 *强调*')
        expect(html).toContain('<strong>重点</strong>')
        expect(html).toContain('<em>强调</em>')
    })

    it('渲染标题与列表', () => {
        const html = renderMarkdown('# 标题\n\n- 一\n- 二')
        expect(html).toContain('<h1>标题</h1>')
        expect(html).toContain('<li>一</li>')
        expect(html).toContain('<li>二</li>')
    })

    it('渲染有序列表与换行', () => {
        const html = renderMarkdown('1. 第一\n2. 第二\n\n换行')
        expect(html).toContain('<ol>')
        expect(html).toContain('<li>第二</li>')
        expect(html).toContain('换行')
        // breaks: true 使单换行生成 <br>
        expect(renderMarkdown('上行\n下行')).toContain('<br')
    })

    it('渲染行内代码与代码块', () => {
        const html = renderMarkdown('`code`\n\n```\nconst a = 1\n```')
        expect(html).toContain('<code>code</code>')
        expect(html).toContain('<pre>')
        expect(html).toContain('const a = 1')
    })

    it('渲染表格与引用', () => {
        const html = renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |\n\n> 引用')
        expect(html).toContain('<table>')
        expect(html).toContain('<td>1</td>')
        expect(html).toContain('<blockquote>')
    })

    it('原始 HTML 被转义，不产生可执行标签（html: false）', () => {
        const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')
        expect(html).not.toContain('<script>')
        expect(html).not.toContain('<img')
        expect(html).toContain('&lt;script&gt;')
    })

    it('拦截 javascript: 协议链接', () => {
        const html = renderMarkdown('[点我](javascript:alert(1))')
        // 不生成 <a>，不出现 href="javascript:
        expect(html).not.toContain('<a ')
        expect(html).not.toContain('href="javascript:')
    })

    it('linkify 自动识别 http 链接', () => {
        const html = renderMarkdown('见 https://example.com/docs 页面')
        expect(html).toContain('<a href="https://example.com/docs"')
    })

    it('空文本返回空串', () => {
        expect(renderMarkdown('')).toBe('')
    })

    it('未闭合的 markdown 标记按字面输出，不抛错', () => {
        expect(() => renderMarkdown('**未闭合')).not.toThrow()
        expect(renderMarkdown('**未闭合')).toContain('**未闭合')
    })
})
