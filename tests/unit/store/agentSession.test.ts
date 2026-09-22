import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNovelStore, AGENT_MAX_MESSAGES } from '../../../src/renderer/src/store/novel'
import { useMainStore } from '../../../src/renderer/src/store/main'
import { CURRENT_VERSION } from '../../../src/shared/migration'
import type { NovelData } from '../../../src/shared/types'

function seedBook(novel: ReturnType<typeof useNovelStore>) {
    novel.initNovel('测试小说')
    novel.volumes.push({
        volumeName: '第一卷',
        volumeSummary: '卷一说明',
        chapters: [
            {
                chapterName: '第一章',
                chapterSummary: '开篇',
                content: '<p>这是<strong>第一章</strong>正文。</p>',
                annotations: []
            },
            {
                chapterName: '第二章',
                content: '<p>第二章正文。</p>',
                annotations: []
            }
        ]
    })
    novel.volumes.push({
        volumeName: '第二卷',
        chapters: [{ chapterName: '第三章', content: '<p>第三章正文。</p>', annotations: [] }]
    })
    novel.characters.push({
        id: 'c1',
        name: '林渊',
        personality: '沉稳',
        appearance: '黑发',
        ageOfAppearance: '20岁',
        content: '主角'
    })
}

describe('novel store · agent 会话', () => {
    let novel: ReturnType<typeof useNovelStore>
    let main: ReturnType<typeof useMainStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        novel = useNovelStore()
        main = useMainStore()
    })

    describe('基础 CRUD', () => {
        it('新建会话：默认标题「新会话」并置为活动会话', () => {
            const id = novel.createAgentSession()
            expect(id).toBeTruthy()
            expect(novel.agent.sessions).toHaveLength(1)
            expect(novel.agent.activeSessionId).toBe(id)
            expect(novel.agent.sessions[0].title).toBe('新会话')
            expect(novel.agent.sessions[0].contextScope).toBe('outline')
            expect(novel.agent.sessions[0].messages).toEqual([])
            expect(main.isDirty).toBe(true)
        })

        it('切换活动会话', () => {
            const a = novel.createAgentSession()
            const b = novel.createAgentSession()
            expect(novel.agent.activeSessionId).toBe(b)
            novel.selectAgentSession(a)
            expect(novel.agent.activeSessionId).toBe(a)
            novel.selectAgentSession('not-exist')
            expect(novel.agent.activeSessionId).toBe(a)
        })

        it('重命名会话；空白名回退「新会话」', () => {
            const id = novel.createAgentSession()
            novel.renameAgentSession(id, '  续写讨论  ')
            expect(novel.agent.sessions[0].title).toBe('续写讨论')
            novel.renameAgentSession(id, '   ')
            expect(novel.agent.sessions[0].title).toBe('新会话')
        })

        it('置顶/取消置顶', () => {
            const id = novel.createAgentSession()
            expect(novel.agent.sessions[0].pinned).toBeFalsy()
            novel.togglePinSession(id)
            expect(novel.agent.sessions[0].pinned).toBe(true)
            novel.togglePinSession(id)
            expect(novel.agent.sessions[0].pinned).toBe(false)
        })

        it('删除活动会话回落到首个会话；删光回落 null', () => {
            const a = novel.createAgentSession()
            const b = novel.createAgentSession()
            expect(novel.agent.activeSessionId).toBe(b)

            novel.deleteAgentSession(b)
            expect(novel.agent.sessions).toHaveLength(1)
            expect(novel.agent.activeSessionId).toBe(a)

            novel.deleteAgentSession(a)
            expect(novel.agent.sessions).toHaveLength(0)
            expect(novel.agent.activeSessionId).toBeNull()
        })

        it('删除非活动会话不影响活动指针', () => {
            const a = novel.createAgentSession()
            const b = novel.createAgentSession()
            novel.deleteAgentSession(a)
            expect(novel.agent.activeSessionId).toBe(b)
            expect(novel.agent.sessions).toHaveLength(1)
        })

        it('置顶会话排序优先于普通会话，组内按 updatedAt 倒序', () => {
            const a = novel.createAgentSession()
            const b = novel.createAgentSession()
            const c = novel.createAgentSession()
            novel.renameAgentSession(a, 'a')
            novel.renameAgentSession(b, 'b')
            novel.renameAgentSession(c, 'c')
            // c 最新
            novel.togglePinSession(a)

            const ids = novel.sortedAgentSessions.map((s) => s.id)
            expect(ids[0]).toBe(a)
            expect(ids.slice(1)).toEqual([c, b])
        })
    })

    describe('消息', () => {
        it('追加消息更新 updatedAt 并标脏', () => {
            const id = novel.createAgentSession()
            const before = novel.agent.sessions[0].updatedAt
            vi.setSystemTime(before + 5000)
            novel.appendAgentMessage(id, { role: 'user', content: '你好' })
            vi.useRealTimers()

            expect(novel.agent.sessions[0].messages).toHaveLength(1)
            expect(novel.agent.sessions[0].messages[0].role).toBe('user')
            expect(novel.agent.sessions[0].messages[0].content).toBe('你好')
            expect(novel.agent.sessions[0].updatedAt).toBeGreaterThan(before)
            expect(main.isDirty).toBe(true)
        })

        it('消息超过 200 条时丢弃最旧', () => {
            const id = novel.createAgentSession()
            for (let i = 0; i < AGENT_MAX_MESSAGES + 10; i++) {
                novel.appendAgentMessage(id, { role: 'user', content: `msg-${i}` })
            }
            const messages = novel.agent.sessions[0].messages
            expect(messages).toHaveLength(AGENT_MAX_MESSAGES)
            expect(messages[0].content).toBe('msg-10')
            expect(messages[messages.length - 1].content).toBe(`msg-${AGENT_MAX_MESSAGES + 9}`)
        })

        it('更新与定稿最后一条 assistant 消息', () => {
            const id = novel.createAgentSession()
            novel.appendAgentMessage(id, { role: 'user', content: '问题' })
            novel.appendAgentMessage(id, { role: 'assistant', content: '' })

            novel.updateLastAssistantMessage(id, '回答第一段')
            novel.updateLastAssistantMessage(id, '回答第一段回答第二段')
            let messages = novel.agent.sessions[0].messages
            expect(messages[messages.length - 1].content).toBe('回答第一段回答第二段')

            novel.finalizeAssistantMessage(id, { error: '已停止' })
            messages = novel.agent.sessions[0].messages
            expect(messages[messages.length - 1].error).toBe('已停止')

            novel.finalizeAssistantMessage(id)
            expect(messages[messages.length - 1].error).toBeUndefined()
        })

        it('不存在的会话 id 调用消息操作不抛错', () => {
            expect(() => {
                novel.appendAgentMessage('nope', { role: 'user', content: 'x' })
                novel.updateLastAssistantMessage('nope', 'x')
                novel.finalizeAssistantMessage('nope', { error: 'e' })
            }).not.toThrow()
        })
    })

    describe('上下文快照', () => {
        it('切换 scope 清空已有快照，强制重捕获', () => {
            const id = novel.createAgentSession('outline')
            novel.ensureAgentContext(id)
            expect(novel.agent.sessions[0].context).toBeTruthy()

            novel.setAgentSessionScope(id, 'fullBook')
            expect(novel.agent.sessions[0].contextScope).toBe('fullBook')
            expect(novel.agent.sessions[0].context).toBeUndefined()
        })

        it('ensureAgentContext 冻结快照，重复调用不重建', () => {
            seedBook(novel)
            const id = novel.createAgentSession('outline')
            novel.ensureAgentContext(id)

            const first = novel.agent.sessions[0].context
            expect(first).toBeTruthy()
            expect(first!.bookName).toBe('测试小说')
            expect(first!.outline).toContain('第一卷')
            expect(first!.outline).toContain('第一章')

            novel.ensureAgentContext(id)
            expect(novel.agent.sessions[0].context).toBe(first)
        })

        it('refreshAgentContext 强制重建快照', () => {
            seedBook(novel)
            const id = novel.createAgentSession('currentChapter')

            vi.useFakeTimers()
            vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
            novel.ensureAgentContext(id)
            const first = novel.agent.sessions[0].context!
            expect(first.capturedAt).toBe(new Date('2026-01-01T00:00:00Z').getTime())

            // 编辑书稿后刷新，快照内容与时间都更新
            novel.volumes[0].chapters[0].chapterName = '第一章（改名）'
            vi.setSystemTime(new Date('2026-01-01T01:00:00Z'))
            novel.refreshAgentContext(id)
            const second = novel.agent.sessions[0].context!
            vi.useRealTimers()

            expect(second.capturedAt).toBeGreaterThan(first.capturedAt)
            expect(second.outline).toContain('第一章（改名）')
            expect(second.bodyText).toContain('这是第一章正文。')
        })

        it('currentChapter scope 按当前选中章定位', () => {
            seedBook(novel)
            main.selectChapter(1, 0) // 第二卷 / 第三章
            const id = novel.createAgentSession('currentChapter')
            novel.ensureAgentContext(id)

            const ctx = novel.agent.sessions[0].context!
            expect(ctx.chapterRef).toEqual({
                volumeIndex: 1,
                chapterIndex: 0,
                chapterName: '第三章'
            })
            expect(ctx.bodyText).toBe('第三章正文。')
        })
    })

    describe('持久化 round-trip（v4）', () => {
        it('toJSON 携带 agent 与 _version，loadFromData 完整恢复', () => {
            seedBook(novel)
            const id = novel.createAgentSession('outline')
            novel.renameAgentSession(id, '续写讨论')
            novel.togglePinSession(id)
            novel.appendAgentMessage(id, { role: 'user', content: '帮我看看大纲' })
            novel.ensureAgentContext(id)

            const json = novel.toJSON()
            const parsed = JSON.parse(json)
            expect(parsed._version).toBe(CURRENT_VERSION)
            expect(parsed.agent.sessions).toHaveLength(1)
            expect(parsed.agent.activeSessionId).toBe(id)
            // 配置类数据不得进入书文件
            expect(json).not.toContain('apiKey')

            const loaded = useNovelStore()
            loaded.loadFromData(parsed as NovelData)
            expect(loaded.agent.activeSessionId).toBe(id)
            expect(loaded.agent.sessions[0].title).toBe('续写讨论')
            expect(loaded.agent.sessions[0].pinned).toBe(true)
            expect(loaded.agent.sessions[0].messages[0].content).toBe('帮我看看大纲')
            expect(loaded.agent.sessions[0].context?.bookName).toBe('测试小说')
        })

        it('loadFromData 对缺失 agent 的旧数据兜底为空结构', () => {
            novel.loadFromData({
                name: '旧书',
                volumes: [],
                characters: [],
                worldViews: []
            })
            expect(novel.agent).toEqual({ sessions: [], activeSessionId: null })
        })

        it('loadFromData 对悬空 activeSessionId 回落到首个会话', () => {
            novel.loadFromData({
                name: '书',
                volumes: [],
                characters: [],
                worldViews: [],
                agent: {
                    sessions: [
                        {
                            id: 's1',
                            title: '会话1',
                            createdAt: 1,
                            updatedAt: 1,
                            contextScope: 'outline',
                            messages: []
                        }
                    ],
                    activeSessionId: 'ghost'
                }
            })
            expect(novel.agent.activeSessionId).toBe('s1')
        })

        it('initNovel 重置 agent 结构', () => {
            novel.createAgentSession()
            expect(novel.agent.sessions).toHaveLength(1)
            novel.initNovel('新书')
            expect(novel.agent).toEqual({ sessions: [], activeSessionId: null })
        })
    })
})
