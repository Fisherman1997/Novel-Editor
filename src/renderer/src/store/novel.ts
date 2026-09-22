import { defineStore } from 'pinia'
import { toRaw } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import {
    NovelData,
    Chapter,
    Character,
    WorldView,
    Annotation,
    AgentBookData,
    AgentSession,
    AgentMessage,
    AgentContextScope
} from '@shared/types'
import { useMainStore } from './main'
import {
    getPlainText,
    unwrapAnnotationFromHtml,
    updateAnnotationColorInHtml
} from '../utils/htmlText'
import { buildAgentContextSnapshot } from '../utils/agentContext'
import { countWords } from '../utils/text'
import { CURRENT_VERSION } from '@shared/migration'

interface NovelState extends NovelData {
    agent: AgentBookData
}

// 单会话消息上限，超出丢最旧（F4.4）
export const AGENT_MAX_MESSAGES = 200

const AGENT_VALID_SCOPES: AgentContextScope[] = ['currentChapter', 'outline', 'fullBook']

// store 侧对 agent 字段兜底规范化（文件层已过 migration，这里防缺省/脏数据）
function normalizeAgent(data?: AgentBookData | null): AgentBookData {
    if (!data || !Array.isArray(data.sessions)) {
        return { sessions: [], activeSessionId: null }
    }
    const sessions: AgentSession[] = data.sessions.filter(
        (s): s is AgentSession => !!s && typeof s.id === 'string'
    )
    const activeSessionId =
        data.activeSessionId && sessions.some((s) => s.id === data.activeSessionId)
            ? data.activeSessionId
            : (sessions[0]?.id ?? null)
    return { sessions, activeSessionId }
}

function findSession(state: NovelState, id: string): AgentSession | undefined {
    return state.agent.sessions.find((s) => s.id === id)
}

export const useNovelStore = defineStore('novel', {
    state: (): NovelState => ({
        name: '',
        volumes: [],
        characters: [],
        worldViews: [],
        agent: { sessions: [], activeSessionId: null }
    }),

    getters: {
        // 获取当前选中的章节
        currentChapter: (state): Chapter | null => {
            const mainStore = useMainStore()
            const { selectedVolumeIndex, selectedChapterIndex } = mainStore

            const volume = state.volumes[selectedVolumeIndex]
            if (volume) {
                return volume.chapters[selectedChapterIndex] || null
            }
            return null
        },

        // 获取总字数（中文按字、英文按词，与编辑器状态栏口径一致）
        totalWordCount: (state): number => {
            let count = 0
            state.volumes.forEach((volume) => {
                volume.chapters.forEach((chapter) => {
                    count += countWords(getPlainText(chapter.content))
                })
            })
            return count
        },

        // 获取当前章节字数
        currentChapterWordCount: (state): number => {
            const mainStore = useMainStore()
            const { selectedVolumeIndex, selectedChapterIndex } = mainStore
            const volume = state.volumes[selectedVolumeIndex]
            if (!volume) return 0
            const chapter = volume.chapters[selectedChapterIndex]
            if (!chapter) return 0
            return countWords(getPlainText(chapter.content))
        },

        // 获取所有标注
        allAnnotations: (state): (Annotation & { volumeIndex: number; chapterIndex: number })[] => {
            const annotations: (Annotation & { volumeIndex: number; chapterIndex: number })[] = []

            state.volumes.forEach((volume, volumeIndex) => {
                volume.chapters.forEach((chapter, chapterIndex) => {
                    if (chapter.annotations) {
                        chapter.annotations.forEach((annotation) => {
                            annotations.push({
                                ...annotation,
                                volumeIndex,
                                chapterIndex
                            })
                        })
                    }
                })
            })

            return annotations
        },

        // AI 助手会话列表：置顶优先，同组按更新时间倒序（F3.5/F3.6）
        sortedAgentSessions: (state): AgentSession[] => {
            return [...state.agent.sessions].sort((a, b) => {
                const pinA = a.pinned ? 1 : 0
                const pinB = b.pinned ? 1 : 0
                if (pinA !== pinB) return pinB - pinA
                return b.updatedAt - a.updatedAt
            })
        }
    },

    actions: {
        // 初始化新书
        initNovel(name: string) {
            this.name = name
            this.volumes = []
            this.characters = []
            this.worldViews = []
            this.agent = { sessions: [], activeSessionId: null }
        },

        // 从数据加载
        loadFromData(data: NovelData) {
            this.name = data.name
            this.volumes = data.volumes || []
            this.characters = data.characters || []
            this.worldViews = data.worldViews || []
            this.agent = normalizeAgent(data.agent)
        },

        // 导出为 JSON（带版本号，供数据迁移检测）
        toJSON(): string {
            return JSON.stringify({
                name: this.name,
                volumes: toRaw(this.volumes),
                characters: toRaw(this.characters),
                worldViews: toRaw(this.worldViews),
                agent: toRaw(this.agent),
                _version: CURRENT_VERSION
            })
        },

        // 标记为已修改
        markDirty() {
            const mainStore = useMainStore()
            mainStore.markDirty()
        },

        // ============ 卷操作 ============

        // 添加卷
        addVolume() {
            const volumeNumber = this.volumes.length + 1
            this.volumes.push({
                volumeName: `第${volumeNumber}卷 未命名`,
                chapters: []
            })
            this.markDirty()
        },

        // 在指定位置插入卷（返回新卷索引）
        insertVolumeAt(index: number): number {
            const target = Math.min(Math.max(index, 0), this.volumes.length)
            this.volumes.splice(target, 0, {
                volumeName: `第${this.volumes.length + 1}卷 未命名`,
                chapters: []
            })
            this.markDirty()
            return target
        },

        // 删除卷
        deleteVolume(index: number) {
            this.volumes.splice(index, 1)
            this.markDirty()
        },

        // 移动卷（拖拽排序）
        moveVolume(from: number, to: number) {
            if (
                from === to ||
                from < 0 ||
                to < 0 ||
                from >= this.volumes.length ||
                to >= this.volumes.length
            )
                return
            const [item] = this.volumes.splice(from, 1)
            this.volumes.splice(to, 0, item)
            this.markDirty()
        },

        // 修改卷名
        updateVolumeName(index: number, name: string) {
            if (this.volumes[index]) {
                this.volumes[index].volumeName = name
                this.markDirty()
            }
        },

        // 修改卷说明
        updateVolumeSummary(index: number, summary: string) {
            if (this.volumes[index]) {
                this.volumes[index].volumeSummary = summary
                this.markDirty()
            }
        },

        // ============ 章节操作 ============

        // 添加章节
        addChapter(volumeIndex: number) {
            const volume = this.volumes[volumeIndex]
            if (volume) {
                const chapterNumber = volume.chapters.length + 1
                volume.chapters.push({
                    chapterName: `第${chapterNumber}章 未命名`,
                    content: '',
                    annotations: []
                })
                this.markDirty()
            }
        },

        // 在指定位置插入章节（返回新章节索引）
        insertChapterAt(volumeIndex: number, chapterIndex: number): number {
            const volume = this.volumes[volumeIndex]
            if (!volume) return -1
            const target = Math.min(Math.max(chapterIndex, 0), volume.chapters.length)
            volume.chapters.splice(target, 0, {
                chapterName: `第${volume.chapters.length + 1}章 未命名`,
                content: '',
                annotations: []
            })
            this.markDirty()
            return target
        },

        // 删除章节
        deleteChapter(volumeIndex: number, chapterIndex: number) {
            const volume = this.volumes[volumeIndex]
            if (volume) {
                volume.chapters.splice(chapterIndex, 1)
                this.markDirty()
            }
        },

        // 移动章节（同卷内拖拽排序）
        moveChapter(volumeIndex: number, from: number, to: number) {
            const volume = this.volumes[volumeIndex]
            if (!volume) return
            if (
                from === to ||
                from < 0 ||
                to < 0 ||
                from >= volume.chapters.length ||
                to >= volume.chapters.length
            )
                return
            const [item] = volume.chapters.splice(from, 1)
            volume.chapters.splice(to, 0, item)
            this.markDirty()
        },

        // 修改章节名
        updateChapterName(volumeIndex: number, chapterIndex: number, name: string) {
            const volume = this.volumes[volumeIndex]
            if (volume && volume.chapters[chapterIndex]) {
                volume.chapters[chapterIndex].chapterName = name
                this.markDirty()
            }
        },

        // 修改章说明
        updateChapterSummary(volumeIndex: number, chapterIndex: number, summary: string) {
            const volume = this.volumes[volumeIndex]
            if (volume && volume.chapters[chapterIndex]) {
                volume.chapters[chapterIndex].chapterSummary = summary
                this.markDirty()
            }
        },

        // 修改章节内容
        updateChapterContent(volumeIndex: number, chapterIndex: number, content: string) {
            const volume = this.volumes[volumeIndex]
            if (volume && volume.chapters[chapterIndex]) {
                volume.chapters[chapterIndex].content = content
                this.markDirty()
            }
        },

        // ============ 人物操作 ============

        // 添加人物
        addCharacter() {
            this.characters.push({
                id: uuidv4(),
                name: '未命名',
                personality: '',
                appearance: '',
                ageOfAppearance: '',
                content: ''
            })
            this.markDirty()
        },

        // 删除人物
        deleteCharacter(index: number) {
            this.characters.splice(index, 1)
            this.markDirty()
        },

        // 移动人物（拖拽排序）
        moveCharacter(from: number, to: number) {
            if (
                from === to ||
                from < 0 ||
                to < 0 ||
                from >= this.characters.length ||
                to >= this.characters.length
            )
                return
            const [item] = this.characters.splice(from, 1)
            this.characters.splice(to, 0, item)
            this.markDirty()
        },

        // 修改人物
        updateCharacter(index: number, data: Partial<Character>) {
            if (this.characters[index]) {
                Object.assign(this.characters[index], data)
                this.markDirty()
            }
        },

        // ============ 世界观操作 ============

        // 添加世界观
        addWorldView() {
            this.worldViews.push({
                id: uuidv4(),
                name: '未命名',
                settings: [],
                content: ''
            })
            this.markDirty()
        },

        // 删除世界观
        deleteWorldView(index: number) {
            this.worldViews.splice(index, 1)
            this.markDirty()
        },

        // 移动世界观（拖拽排序）
        moveWorldView(from: number, to: number) {
            if (
                from === to ||
                from < 0 ||
                to < 0 ||
                from >= this.worldViews.length ||
                to >= this.worldViews.length
            )
                return
            const [item] = this.worldViews.splice(from, 1)
            this.worldViews.splice(to, 0, item)
            this.markDirty()
        },

        // 修改世界观
        updateWorldView(index: number, data: Partial<WorldView>) {
            if (this.worldViews[index]) {
                Object.assign(this.worldViews[index], data)
                this.markDirty()
            }
        },

        // ============ 标注操作 ============

        // 添加标注
        addAnnotation(
            volumeIndex: number,
            chapterIndex: number,
            annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
        ) {
            const chapter = this.volumes[volumeIndex]?.chapters[chapterIndex]
            if (chapter) {
                if (!chapter.annotations) {
                    chapter.annotations = []
                }
                chapter.annotations.push({
                    ...annotation,
                    id: uuidv4(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                })
                this.markDirty()
            }
        },

        // 删除标注
        removeAnnotation(volumeIndex: number, chapterIndex: number, annotationId: string) {
            const chapter = this.volumes[volumeIndex]?.chapters[chapterIndex]
            if (chapter && chapter.annotations) {
                chapter.annotations = chapter.annotations.filter((a) => a.id !== annotationId)
                this.markDirty()
            }
        },

        // 更新标注
        updateAnnotation(
            volumeIndex: number,
            chapterIndex: number,
            annotationId: string,
            data: Partial<Annotation>
        ) {
            const chapter = this.volumes[volumeIndex]?.chapters[chapterIndex]
            if (chapter && chapter.annotations) {
                const annotation = chapter.annotations.find((a) => a.id === annotationId)
                if (annotation) {
                    Object.assign(annotation, data, { updatedAt: Date.now() })
                    this.markDirty()
                }
            }
        },

        // 链接标注到人物
        linkAnnotationToCharacter(
            volumeIndex: number,
            chapterIndex: number,
            annotationId: string,
            characterId: string
        ) {
            this.updateAnnotation(volumeIndex, chapterIndex, annotationId, {
                linkedCharacterId: characterId
            })
        },

        // 链接标注到章节
        linkAnnotationToChapter(
            volumeIndex: number,
            chapterIndex: number,
            annotationId: string,
            targetVolumeIndex: number,
            targetChapterIndex: number
        ) {
            this.updateAnnotation(volumeIndex, chapterIndex, annotationId, {
                linkedChapter: { volumeIndex: targetVolumeIndex, chapterIndex: targetChapterIndex }
            })
        },

        // ---------- 标注 HTML 操作（用于编辑器未加载的章节） ----------

        // 从章节正文中移除标注 mark（保留正文文本），并删除元数据
        removeAnnotationWithMark(volumeIndex: number, chapterIndex: number, annotationId: string) {
            const chapter = this.volumes[volumeIndex]?.chapters[chapterIndex]
            if (!chapter) return
            if (chapter.content) {
                chapter.content = unwrapAnnotationFromHtml(chapter.content, annotationId)
            }
            this.removeAnnotation(volumeIndex, chapterIndex, annotationId)
        },

        // 更新章节标注颜色（元数据 + 正文 mark）
        updateAnnotationColor(
            volumeIndex: number,
            chapterIndex: number,
            annotationId: string,
            color: string
        ) {
            const chapter = this.volumes[volumeIndex]?.chapters[chapterIndex]
            if (!chapter) return
            if (chapter.content) {
                chapter.content = updateAnnotationColorInHtml(chapter.content, annotationId, color)
            }
            this.updateAnnotation(volumeIndex, chapterIndex, annotationId, { color })
        },

        // ============ AI 助手会话（Agent） ============

        // 新建会话并置为活动会话，返回会话 id
        createAgentSession(scope: AgentContextScope = 'outline'): string {
            const now = Date.now()
            const session: AgentSession = {
                id: uuidv4(),
                title: '新会话',
                createdAt: now,
                updatedAt: now,
                pinned: false,
                contextScope: scope,
                messages: []
            }
            this.agent.sessions.unshift(session)
            this.agent.activeSessionId = session.id
            this.markDirty()
            return session.id
        },

        // 切换活动会话
        selectAgentSession(id: string) {
            if (findSession(this, id)) {
                this.agent.activeSessionId = id
                this.markDirty()
            }
        },

        // 重命名会话（空标题回退默认名）
        renameAgentSession(id: string, title: string) {
            const session = findSession(this, id)
            if (session) {
                session.title = title.trim() || '新会话'
                session.updatedAt = Date.now()
                this.markDirty()
            }
        },

        // 置顶/取消置顶
        togglePinSession(id: string) {
            const session = findSession(this, id)
            if (session) {
                session.pinned = !session.pinned
                this.markDirty()
            }
        },

        // 删除会话；删除活动会话时回落到首个会话或 null（F3.3）
        deleteAgentSession(id: string) {
            const index = this.agent.sessions.findIndex((s) => s.id === id)
            if (index === -1) return
            const wasActive = this.agent.activeSessionId === id
            this.agent.sessions.splice(index, 1)
            if (wasActive) {
                this.agent.activeSessionId = this.agent.sessions[0]?.id ?? null
            }
            this.markDirty()
        },

        // 切换上下文范围；已有快照则清掉，强制下次重新捕获（F7.4）
        setAgentSessionScope(id: string, scope: AgentContextScope) {
            const session = findSession(this, id)
            if (session && AGENT_VALID_SCOPES.includes(scope)) {
                session.contextScope = scope
                session.context = undefined
                this.markDirty()
            }
        },

        // 无快照则按当前 scope 冻结一份只读纯文本快照（F7.2）
        ensureAgentContext(id: string) {
            const session = findSession(this, id)
            if (!session || session.context) return
            session.context = buildAgentContextSnapshot(
                {
                    bookName: this.name,
                    volumes: toRaw(this.volumes),
                    characters: toRaw(this.characters),
                    worldViews: toRaw(this.worldViews)
                },
                session.contextScope,
                this.currentChapterPosition()
            )
            this.markDirty()
        },

        // 强制重建当前 scope 快照（F7.3）
        refreshAgentContext(id: string) {
            const session = findSession(this, id)
            if (!session) return
            session.context = buildAgentContextSnapshot(
                {
                    bookName: this.name,
                    volumes: toRaw(this.volumes),
                    characters: toRaw(this.characters),
                    worldViews: toRaw(this.worldViews)
                },
                session.contextScope,
                this.currentChapterPosition()
            )
            this.markDirty()
        },

        // 追加消息；超 200 条丢最旧（F4.4）
        appendAgentMessage(id: string, msg: Omit<AgentMessage, 'id' | 'createdAt'>) {
            const session = findSession(this, id)
            if (!session) return
            session.messages.push({ ...msg, id: uuidv4(), createdAt: Date.now() })
            if (session.messages.length > AGENT_MAX_MESSAGES) {
                session.messages.splice(0, session.messages.length - AGENT_MAX_MESSAGES)
            }
            session.updatedAt = Date.now()
            this.markDirty()
        },

        // 流式追加到最后一条 assistant 消息
        updateLastAssistantMessage(id: string, content: string) {
            const session = findSession(this, id)
            if (!session) return
            for (let i = session.messages.length - 1; i >= 0; i--) {
                const msg = session.messages[i]
                if (msg.role === 'assistant') {
                    msg.content = content
                    session.updatedAt = Date.now()
                    this.markDirty()
                    return
                }
            }
        },

        // 定稿最后一条 assistant 消息（可携带错误标记）
        finalizeAssistantMessage(id: string, options: { error?: string } = {}) {
            const session = findSession(this, id)
            if (!session) return
            for (let i = session.messages.length - 1; i >= 0; i--) {
                const msg = session.messages[i]
                if (msg.role === 'assistant') {
                    msg.error = options.error
                    session.updatedAt = Date.now()
                    this.markDirty()
                    return
                }
            }
        },

        // 当前章定位（卷/章索引二元组）
        currentChapterPosition(): { volumeIndex: number; chapterIndex: number } | null {
            const mainStore = useMainStore()
            const volume = this.volumes[mainStore.selectedVolumeIndex]
            if (!volume || !volume.chapters[mainStore.selectedChapterIndex]) return null
            return {
                volumeIndex: mainStore.selectedVolumeIndex,
                chapterIndex: mainStore.selectedChapterIndex
            }
        }
    }
})
