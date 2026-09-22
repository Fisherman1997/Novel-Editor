import { describe, it, expect } from 'vitest'
import {
    getPlainText,
    findMatches,
    replaceMatchesInHtml,
    getAnnotatedTextFromHtml,
    unwrapAnnotationFromHtml,
    buildMatchRegex
} from '../../../src/renderer/src/utils/htmlText'

describe('htmlText', () => {
    describe('getPlainText', () => {
        it('应该从 HTML 中提取纯文本', () => {
            expect(getPlainText('<p>你好</p><p>世界</p>')).toBe('你好世界')
        })

        it('应该处理空字符串', () => {
            expect(getPlainText('')).toBe('')
            // DOMParser 会保留空白字符
            expect(getPlainText('   ')).toMatch(/^\s*$/)
        })

        it('应该忽略 HTML 标签', () => {
            expect(getPlainText('<strong>加粗</strong> <em>斜体</em>')).toBe('加粗 斜体')
        })

        it('应该处理嵌套标签', () => {
            expect(getPlainText('<div><p><strong>嵌套</strong></p></div>')).toBe('嵌套')
        })

        it('应该提取 data-annotation-id 标注的文本', () => {
            const html =
                '<p>普通文本<mark data-annotation-id="abc" data-color="#ff0">标注文本</mark>继续</p>'
            expect(getPlainText(html)).toBe('普通文本标注文本继续')
        })
    })

    describe('buildMatchRegex', () => {
        it('应该构建基本正则', () => {
            const regex = buildMatchRegex('hello', { caseSensitive: false })
            expect(regex).not.toBeNull()
            expect('Hello World'.search(regex!)).toBe(0)
        })

        it('应该处理空查询', () => {
            expect(buildMatchRegex('', {})).toBeNull()
        })

        it('应该处理无效正则', () => {
            expect(buildMatchRegex('[invalid', { useRegex: true })).toBeNull()
        })
    })

    describe('findMatches', () => {
        it('应该查找所有匹配', () => {
            const text = 'abc abc abc'
            const matches = findMatches(text, 'abc', {})
            expect(matches).toHaveLength(3)
            expect(matches[0]).toEqual({ start: 0, end: 3, text: 'abc' })
        })

        it('应该返回空数组（无匹配）', () => {
            expect(findMatches('hello', 'xyz', {})).toHaveLength(0)
        })

        it('应该支持正则', () => {
            const matches = findMatches('a1b2c3', '\\d', { useRegex: true })
            expect(matches).toHaveLength(3)
        })

        it('应该支持大小写敏感', () => {
            const matches = findMatches('Hello HELLO hello', 'hello', { caseSensitive: true })
            expect(matches).toHaveLength(1)
            expect(matches[0].text).toBe('hello')
        })

        it('应该限制最大匹配数', () => {
            const text = 'a'.repeat(2000)
            const matches = findMatches(text, 'a', {})
            expect(matches.length).toBeLessThanOrEqual(1000)
        })
    })

    describe('replaceMatchesInHtml', () => {
        it('应该替换文本节点内容而不损坏标签', () => {
            const html = '<p>你好世界</p>'
            const matches = [{ start: 1, end: 3, text: '好世' }]
            const result = replaceMatchesInHtml(html, matches, 'XX')
            expect(result).toContain('<p>')
            expect(result).toContain('</p>')
            expect(getPlainText(result)).toBe('你XX界')
        })

        it('应该处理多个匹配', () => {
            const html = '<p>abc abc abc</p>'
            const matches = [
                { start: 0, end: 3, text: 'abc' },
                { start: 4, end: 7, text: 'abc' }
            ]
            const result = replaceMatchesInHtml(html, matches, 'XY')
            expect(getPlainText(result)).toBe('XY XY abc')
        })

        it('应该保持空列表不变', () => {
            const html = '<p>不变</p>'
            expect(replaceMatchesInHtml(html, [], 'X')).toBe('<p>不变</p>')
        })
    })

    describe('getAnnotatedTextFromHtml', () => {
        it('应该获取标注覆盖的文本', () => {
            const html = '<p>普通<mark data-annotation-id="abc">标注文本</mark>结尾</p>'
            expect(getAnnotatedTextFromHtml(html, 'abc')).toBe('标注文本')
        })

        it('找不到标注时返回空字符串', () => {
            const html = '<p>普通文本</p>'
            expect(getAnnotatedTextFromHtml(html, 'notfound')).toBe('')
        })

        it('应该处理空输入', () => {
            expect(getAnnotatedTextFromHtml('', 'abc')).toBe('')
            expect(getAnnotatedTextFromHtml('<p>text</p>', '')).toBe('')
        })
    })

    describe('unwrapAnnotationFromHtml', () => {
        it('应该移除标注 mark 包裹保留文本', () => {
            const html = '<p>开头<mark data-annotation-id="abc">标注</mark>结尾</p>'
            const result = unwrapAnnotationFromHtml(html, 'abc')
            expect(result).not.toContain('data-annotation-id')
            expect(getPlainText(result)).toBe('开头标注结尾')
        })

        it('找不到标注时原样返回', () => {
            const html = '<p>原样</p>'
            expect(unwrapAnnotationFromHtml(html, 'notfound')).toBe(html)
        })
    })
})
