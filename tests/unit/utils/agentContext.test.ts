import { describe, it, expect } from 'vitest'
import {
    buildAgentContextSnapshot,
    truncateHeadTail,
    truncateHead,
    OUTLINE_MAX_CHARS,
    CURRENT_CHAPTER_MAX_CHARS,
    FULL_BOOK_MAX_CHARS,
    type AgentSnapshotInput
} from '../../../src/renderer/src/utils/agentContext'

const NOW = 1_700_000_000_000

function makeInput(overrides: Partial<AgentSnapshotInput> = {}): AgentSnapshotInput {
    return {
        bookName: '星海旅人',
        volumes: [
            {
                volumeName: '第一卷 启程',
                volumeSummary: '主角离乡',
                chapters: [
                    {
                        chapterName: '第一章 夜航',
                        chapterSummary: '开篇伏笔',
                        content: '<p>海风把<strong>灯火</strong>吹得摇晃。</p>',
                        annotations: []
                    },
                    {
                        chapterName: '第二章 追兵',
                        content: '<p>追兵来了。</p>',
                        annotations: []
                    }
                ]
            }
        ],
        characters: [
            {
                id: 'c1',
                name: '苏晚',
                personality: '冷静',
                appearance: '银发',
                ageOfAppearance: '19岁',
                content: '旅团斥候'
            }
        ],
        worldViews: [
            {
                id: 'w1',
                name: '灵脉体系',
                settings: ['灵脉分九品', '断裂不可逆'],
                content: '天地灵脉驱动一切机关。'
            }
        ],
        ...overrides
    }
}

describe('agentContext', () => {
    describe('truncateHeadTail', () => {
        it('未超上限原样返回', () => {
            expect(truncateHeadTail('短文本', 100)).toBe('短文本')
        })

        it('超上限时头尾保留并插入省略标记，总长不超上限', () => {
            const text = 'A'.repeat(500) + 'B'.repeat(500)
            const result = truncateHeadTail(text, 200)
            expect(result.length).toBeLessThanOrEqual(200)
            expect(result).toContain('……（中间省略）……')
            expect(result.startsWith('A')).toBe(true)
            expect(result.endsWith('B')).toBe(true)
        })

        it('空文本与非正上限返回空串', () => {
            expect(truncateHeadTail('', 10)).toBe('')
            expect(truncateHeadTail('abc', 0)).toBe('')
        })
    })

    describe('truncateHead', () => {
        it('未超上限原样返回', () => {
            expect(truncateHead('abc', 10)).toBe('abc')
        })

        it('超上限保留头部并标记省略', () => {
            const text = 'x'.repeat(OUTLINE_MAX_CHARS + 100)
            const result = truncateHead(text, 100)
            expect(result.length).toBeLessThanOrEqual(100)
            expect(result).toContain('以下内容已省略')
            expect(result.startsWith('xxx')).toBe(true)
        })
    })

    describe('scope = outline', () => {
        it('包含书名、卷章标题树与卷章说明，不含正文', () => {
            const snap = buildAgentContextSnapshot(makeInput(), 'outline', null, NOW)
            expect(snap.scope).toBe('outline')
            expect(snap.bookName).toBe('星海旅人')
            expect(snap.capturedAt).toBe(NOW)
            expect(snap.outline).toContain('第一卷 启程')
            expect(snap.outline).toContain('卷说明：主角离乡')
            expect(snap.outline).toContain('第一章 夜航')
            expect(snap.outline).toContain('章说明：开篇伏笔')
            expect(snap.bodyText).toBeUndefined()
            expect(snap.chapterRef).toBeUndefined()
        })

        it('附带人物与世界观资料纯文本', () => {
            const snap = buildAgentContextSnapshot(makeInput(), 'outline', null, NOW)
            expect(snap.materials).toContain('苏晚')
            expect(snap.materials).toContain('冷静')
            expect(snap.materials).toContain('灵脉体系')
            expect(snap.materials).toContain('灵脉分九品')
        })

        it('大纲超上限时尾部截断并记录统计', () => {
            const volumes = Array.from({ length: 60 }, (_, i) => ({
                volumeName: `第${i + 1}卷 ${'很長的卷名'.repeat(10)}`,
                volumeSummary: '说明'.repeat(20),
                chapters: Array.from({ length: 20 }, (_, j) => ({
                    chapterName: `第${j + 1}章 ${'章名内容'.repeat(8)}`,
                    chapterSummary: '章说明'.repeat(20),
                    content: '<p>正文</p>'
                }))
            }))
            const snap = buildAgentContextSnapshot(makeInput({ volumes }), 'outline', null, NOW)
            expect(snap.truncation?.truncated).toBe(true)
            expect(snap.outline.length).toBeLessThanOrEqual(OUTLINE_MAX_CHARS + 30)
            expect(snap.outline).toContain('以下内容已省略')
            expect(snap.truncation!.originalChars).toBeGreaterThan(snap.truncation!.keptChars)
        })
    })

    describe('scope = currentChapter', () => {
        it('包含大纲 + 当前章纯文本（HTML 正确转换，无标签泄露）', () => {
            const snap = buildAgentContextSnapshot(
                makeInput(),
                'currentChapter',
                { volumeIndex: 0, chapterIndex: 0 },
                NOW
            )
            expect(snap.chapterRef).toEqual({
                volumeIndex: 0,
                chapterIndex: 0,
                chapterName: '第一章 夜航'
            })
            expect(snap.bodyText).toBe('海风把灯火吹得摇晃。')
            expect(snap.bodyText).not.toContain('<p>')
            expect(snap.bodyText).not.toContain('<strong>')
            expect(snap.outline).toContain('第一章 夜航')
        })

        it('当前章定位无效时无正文但仍返回大纲', () => {
            const snap = buildAgentContextSnapshot(
                makeInput(),
                'currentChapter',
                { volumeIndex: 99, chapterIndex: 0 },
                NOW
            )
            expect(snap.chapterRef).toBeUndefined()
            expect(snap.bodyText).toBeUndefined()
            expect(snap.outline).toContain('第一卷 启程')
        })

        it('超长正文头尾截断并插入中间省略标记', () => {
            const long = '<p>' + '字'.repeat(CURRENT_CHAPTER_MAX_CHARS + 5000) + '</p>'
            const input = makeInput()
            input.volumes[0].chapters[0].content = long
            const snap = buildAgentContextSnapshot(
                input,
                'currentChapter',
                { volumeIndex: 0, chapterIndex: 0 },
                NOW
            )
            expect(snap.bodyText!.length).toBeLessThanOrEqual(CURRENT_CHAPTER_MAX_CHARS)
            expect(snap.bodyText).toContain('……（中间省略）……')
            expect(snap.truncation?.truncated).toBe(true)
        })
    })

    describe('scope = fullBook', () => {
        it('包含大纲 + 全书纯文本拼接', () => {
            const snap = buildAgentContextSnapshot(makeInput(), 'fullBook', null, NOW)
            expect(snap.bodyText).toContain('第一卷 启程')
            expect(snap.bodyText).toContain('第一章 夜航')
            expect(snap.bodyText).toContain('海风把灯火吹得摇晃。')
            expect(snap.bodyText).toContain('第二章 追兵')
            expect(snap.bodyText).toContain('追兵来了。')
            expect(snap.bodyText).not.toContain('<p>')
        })

        it('超长全书头尾截断，不超过上限', () => {
            const volumes = Array.from({ length: 30 }, (_, i) => ({
                volumeName: `第${i + 1}卷`,
                chapters: Array.from({ length: 30 }, (_, j) => ({
                    chapterName: `第${j + 1}章`,
                    content: `<p>${'长'.repeat(4000)}</p>`
                }))
            }))
            const snap = buildAgentContextSnapshot(makeInput({ volumes }), 'fullBook', null, NOW)
            expect(snap.bodyText!.length).toBeLessThanOrEqual(FULL_BOOK_MAX_CHARS)
            expect(snap.bodyText).toContain('……（中间省略）……')
            expect(snap.truncation?.truncated).toBe(true)
        })
    })

    it('快照为纯数据：不含函数/响应式代理，可安全序列化', () => {
        const input = makeInput()
        const snap = buildAgentContextSnapshot(
            input,
            'currentChapter',
            { volumeIndex: 0, chapterIndex: 0 },
            NOW
        )
        // JSON round-trip 相等 ⇒ 全为原始值、无共享引用语义
        expect(JSON.parse(JSON.stringify(snap))).toEqual(snap)
        // 构建后修改输入不影响已冻结快照
        input.volumes[0].chapters[0].content = '<p>被改掉了</p>'
        input.characters[0].name = '改名'
        expect(snap.bodyText).toBe('海风把灯火吹得摇晃。')
        expect(snap.materials).toContain('苏晚')
    })

    it('空书籍也能产出结构完整的快照', () => {
        const snap = buildAgentContextSnapshot(
            { bookName: '空书', volumes: [], characters: [], worldViews: [] },
            'fullBook',
            null,
            NOW
        )
        expect(snap.outline).toBe('')
        expect(snap.bodyText).toBe('')
        expect(snap.materials).toBe('')
        expect(snap.truncation).toEqual({
            truncated: false,
            originalChars: 0,
            keptChars: 0
        })
    })
})
