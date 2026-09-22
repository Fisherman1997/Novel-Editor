// AI 写作专家提示词与消息拼装
//
// 铁律（F6）在 system prompt 层明文落地：只输出建议、永不声称已写入书稿、
// 永不要求修改 chapter.content。上下文以纯文本快照注入 system 消息尾部，
// 不向模型暴露任何可写数据结构。

import type { AgentContextSnapshot, AgentMessage } from '@shared/types'

export const SYSTEM_PROMPT = `你是一名专业的中文小说写作专家，内嵌于写作软件的「AI 助手」面板，与作者协作打磨作品。

能力范围：
- 大纲规划：卷/章结构、节奏控制、钩子与转折设计
- 续写建议：基于已有正文给出续写方向与示例段落
- 润色改写：对作者提供的段落优化措辞、节奏与描写
- 一致性检查：对照人物小传、世界观设定与已有情节，指出矛盾与伏笔问题

硬性约束（必须遵守）：
1. 你只能输出建议与讨论文本，绝不能声称已经修改、写入或保存了书稿。
2. 永远不要要求作者把章节交给你来改；任何落稿操作都由作者手动复制粘贴或编辑完成。
3. 给出示例文本时，须以「建议如下，是否采纳由你决定」的方式呈现，不得暗示已生效。
4. 回答必须基于下方提供的书籍上下文；上下文不足时明确说明缺少什么，不得编造正文情节。
5. 上下文是只读快照，可能已截断；不要假设自己读过被省略的部分。
6. 默认使用中文回答；作者使用其他语言提问时跟随其语言。

风格：面向创作者的协作口吻，先给结论或方案，再给必要理由；务实具体，避免空套话。`

// 快捷指令 chips（F5.5），文案可在实现时微调
export interface QuickPrompt {
    id: string
    label: string
    text: string
}

export const QUICK_PROMPTS: QuickPrompt[] = [
    {
        id: 'continue',
        label: '续写本章',
        text: '请基于当前章上下文，给出 2~3 个不同走向的续写方案，并为每个方案写一段约 300 字的示例续写。'
    },
    {
        id: 'polish',
        label: '润色选段',
        text: '请润色下面这段文字，在保留原意的前提下优化节奏与描写，并说明主要改动点：\n\n（在此粘贴需要润色的段落）'
    },
    {
        id: 'foreshadow',
        label: '检查伏笔',
        text: '请对照大纲与已有章节，列出尚未回收的伏笔，并指出可能的回收时机与风险。'
    },
    {
        id: 'next-chapter',
        label: '生成下一章大纲',
        text: '请根据当前进度生成下一章的大纲：目标、冲突、转折、结尾钩子各一段，并标注需要延续的人物线。'
    },
    {
        id: 'consistency',
        label: '人设一致性',
        text: '请对照人物资料与已有章节，检查主要人物的言行是否符合既定人设，列出矛盾点及修改建议。'
    }
]

// 单条用户输入上限（F8.8）
export const MAX_USER_INPUT_CHARS = 8000

// 把冻结快照格式化为给模型看的纯文本上下文说明
export function buildContextNote(snapshot: AgentContextSnapshot): string {
    const scopeLabel =
        snapshot.scope === 'outline'
            ? '大纲'
            : snapshot.scope === 'currentChapter'
              ? '当前章'
              : '全书'

    const lines: string[] = [
        '【书籍上下文 · 只读快照】',
        `书名：${snapshot.bookName}`,
        `范围：${scopeLabel}`,
        `捕获时间：${new Date(snapshot.capturedAt).toLocaleString()}`,
        '',
        '—— 大纲 ——',
        snapshot.outline || '（暂无大纲）'
    ]

    if (snapshot.chapterRef) {
        lines.push('')
        lines.push(`—— 当前章：${snapshot.chapterRef.chapterName} ——`)
    }

    if (snapshot.bodyText !== undefined) {
        lines.push('')
        lines.push('—— 正文 ——')
        lines.push(snapshot.bodyText || '（正文为空）')
    }

    if (snapshot.materials) {
        lines.push('')
        lines.push('—— 人物与世界观资料 ——')
        lines.push(snapshot.materials)
    }

    if (snapshot.truncation?.truncated) {
        lines.push('')
        lines.push(
            `【注意】上下文已截断：原 ${snapshot.truncation.originalChars} 字符，保留 ${snapshot.truncation.keptChars} 字符。请勿假设已阅读全部内容；若关键信息可能被省略，请向作者确认。`
        )
    }

    return lines.join('\n')
}

export interface BuildMessagesOptions {
    system?: string
    snapshot?: AgentContextSnapshot | null
    history?: Array<Pick<AgentMessage, 'role' | 'content' | 'error'>>
    userText: string
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

// 拼装发送给模型的消息序列：
// system（含冻结快照上下文）→ history（user/assistant 交替，过滤空消息）→ 本轮 user
export function buildMessages(options: BuildMessagesOptions): ChatMessage[] {
    const system = options.system ?? SYSTEM_PROMPT
    const snapshot = options.snapshot ?? null

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: snapshot ? `${system}\n\n${buildContextNote(snapshot)}` : system
        }
    ]

    for (const msg of options.history ?? []) {
        if (!msg.content) continue
        messages.push({ role: msg.role, content: msg.content })
    }

    messages.push({ role: 'user', content: options.userText })
    return messages
}
