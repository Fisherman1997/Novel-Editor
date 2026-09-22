# Novel Editor 小说编辑器

一款功能完善的桌面小说写作工具，基于 Electron + Vue 3 + TypeScript + Tiptap 构建。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.0-green.svg)
![Electron](https://img.shields.io/badge/electron-28.0.0-purple.svg)
![Vue](https://img.shields.io/badge/vue-3.3.4-green.svg)

## ✨ 功能特性

### 核心功能

- 📝 **富文本编辑** - 基于 Tiptap 编辑器，支持加粗、斜体、标题、列表等格式
- ↩️ **撤销/重做** - 支持 50 步历史，快捷键 Ctrl+Z / Ctrl+Y
- 💾 **自动保存** - 定时 30 秒自动保存 + 内容变化 5 秒防抖保存
- 🔍 **搜索替换** - 全文搜索，支持正则表达式，当前章节/全书范围
- 📎 **标注功能** - 高亮文本、添加备注、链接到人物或章节
- 📤 **多格式导出** - 全书导出、按卷导出、按章导出为文本文件

### 书籍管理

- 📚 **卷章结构** - 灵活的卷章管理，支持增删改
- 👥 **人物档案** - 角色信息管理（姓名、性格、外貌、详细描述）
- 🌍 **世界观设定** - 世界背景、魔法系统、势力关系等设定
- 📋 **卷章说明** - 为每一卷和每一章添加说明备注

### AI 写作助手

- 🤖 **右侧栏「助手」页签** - 多会话管理（新建/切换/重命名/删除/置顶），会话随书保存
- 💬 **流式对话** - 逐字输出、生成中可停止、错误可见可重试；同一时刻仅一个请求
- 🎯 **三种上下文范围** - 大纲 / 当前章 / 全书；首次发送时冻结纯文本快照，支持手动「刷新上下文」
- ⚡ **快捷指令** - 续写本章、润色选段、检查伏笔、生成下一章大纲、人设一致性
- 🔒 **永不改稿铁律** - AI 只输出建议，不提供「应用到章节」，仅可复制；API Key 只存本机 localStorage，不写入 `.xstxt`
- 🌐 **兼容 OpenAI 接口** - 配置 Base URL / API Key / Model / Temperature / Max Tokens，支持任意 OpenAI 兼容服务（含自建部署）

### 编辑器特性

- 🎨 **自定义主题** - 字体大小、字体、颜色、背景色、行高可调
- 📊 **字数统计** - 实时统计当前章节和全书字数
- 📁 **最近文件** - 保存最近 30 个打开的文件
- ⌨️ **快捷键** - Ctrl+S 保存、Ctrl+N 新建、Ctrl+O 打开、Ctrl+F 搜索

### 技术特性

- 🔄 **数据迁移** - 自动兼容旧版文件格式
- 🔄 **自动更新** - 支持 GitHub 发布的自动更新
- 📝 **日志系统** - 文件日志记录，自动轮转
- 🛡️ **错误处理** - 全局错误捕获和处理

## 📦 安装

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 开发环境

```bash
npm run dev
```

### 构建发布

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 🚀 快速开始

1. **新建小说**
   - 点击左侧"新建"按钮
   - 输入书名和保存路径
   - 点击"创建"

2. **编写内容**
   - 点击左侧"+"按钮添加卷和章节
   - 点击章节名称进入编辑
   - 使用工具栏进行格式化

3. **管理人物和设定**
   - 点击右侧面板的"人物"标签
   - 添加角色并填写信息
   - 点击"设定"标签管理世界观

4. **使用 AI 助手**
   - 点击右侧面板的"助手"标签
   - 打开"设置"，填写 Base URL、API Key、模型名（任意 OpenAI 兼容服务）
   - 新建会话，选择上下文范围（大纲/当前章/全书），开始提问
   - 对回复满意时点"复制"，手动粘贴进书稿 —— 助手永远不会替你改稿

5. **导出小说**
   - 点击编辑器底部的"导出"按钮
   - 选择导出类型（全书/按卷/按章）
   - 选择导出路径

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+S` | 保存文件 |
| `Ctrl+N` | 新建文件 |
| `Ctrl+O` | 打开文件 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Ctrl+F` | 搜索 |
| `Ctrl+B` | 加粗 |
| `Ctrl+I` | 斜体 |
| `Ctrl+U` | 下划线 |

## 📁 文件格式

保存的 `.xstxt` 文件是 JSON 格式，结构如下：

```json
{
  "name": "小说名称",
  "volumes": [
    {
      "volumeName": "第一卷",
      "volumeSummary": "卷的说明",
      "chapters": [
        {
          "chapterName": "第一章",
          "chapterSummary": "章的说明",
          "content": "<p>HTML格式的内容</p>",
          "annotations": []
        }
      ]
    }
  ],
  "characters": [
    {
      "id": "uuid",
      "name": "角色名",
      "personality": "性格",
      "appearance": "外貌",
      "ageOfAppearance": "年龄",
      "content": "详细描述"
    }
  ],
  "worldViews": [
    {
      "id": "uuid",
      "name": "设定名称",
      "settings": ["要点1", "要点2"],
      "content": "详细描述"
    }
  ],
  "agent": {
    "sessions": [
      {
        "id": "uuid",
        "title": "会话标题",
        "createdAt": 1700000000000,
        "updatedAt": 1700000000000,
        "pinned": false,
        "contextScope": "outline",
        "context": {
          "capturedAt": 1700000000000,
          "scope": "outline",
          "bookName": "小说名称",
          "outline": "冻结的大纲纯文本…",
          "materials": "人物与世界观纯文本…",
          "truncation": { "truncated": false, "originalChars": 0, "keptChars": 0 }
        },
        "messages": [
          { "id": "uuid", "role": "user", "content": "提问", "createdAt": 1700000000000 },
          { "id": "uuid", "role": "assistant", "content": "建议回复", "createdAt": 1700000000000 }
        ]
      }
    ],
    "activeSessionId": "uuid"
  },
  "_version": 4
}
```

> 说明：`agent` 为 AI 助手的会话/消息/上下文快照，随书保存；模型连接配置（`baseUrl`/`apiKey` 等）仅存本机 `localStorage`，**不会**出现在此文件中。旧版文件打开时自动迁移到 v4 并补全空的 `agent` 结构。

## 📤 导出格式

导出的文本文件结构：

```
导出路径/
└── 小说名称/
    ├── 人物/
    │   ├── 张三.txt
    │   └── 李四.txt
    ├── 设定/
    │   └── 魔法系统.txt
    ├── 第一卷.txt
    └── 第二卷.txt
```

导出的文本文件内容示例：

```
════════════════════════════════════════
  第一卷 觉醒
════════════════════════════════════════

【卷说明】主角从普通人成长为英雄的历程

──────────────────────────────────────

【第一章 初遇】

【章说明】主角在村口遇到神秘老人

　　那天阳光明媚，张三在村口的老槐树下遇到了一位神秘的老人。
　　老人递给张三一本泛黄的古书，说道："这是你的命运。"

──────────────────────────────────────
```

## 🛠️ 开发

### 项目结构

```
src/
├── shared/                 # 共享类型和工具
│   ├── types.ts           # TypeScript 类型定义
│   └── migration.ts       # 数据迁移工具
├── main/                   # 主进程
│   ├── index.ts           # 应用入口
│   ├── ipc/               # IPC 处理器
│   ├── logger.ts          # 日志系统
│   └── updater.ts         # 自动更新
├── preload/                # 预加载脚本
│   ├── index.ts           # API 暴露
│   └── index.d.ts         # 类型定义
└── renderer/               # 渲染进程
    └── src/
        ├── components/    # Vue 组件（含 agent/ 助手面板）
        ├── store/         # Pinia 状态（含 agentConfig LLM 配置）
        ├── composables/   # 组合式函数（含 useAgentChat 流式对话）
        └── utils/         # 工具函数（含 agentPrompt / agentContext）
```

### 可用命令

```bash
# 开发
npm run dev          # 启动开发服务器

# 构建
npm run build        # 类型检查 + 构建
npm run build:win    # 构建 Windows 版本
npm run build:mac    # 构建 macOS 版本
npm run build:linux  # 构建 Linux 版本

# 代码质量
npm run lint         # ESLint 检查
npm run format       # Prettier 格式化
npm run typecheck    # TypeScript 类型检查

# 测试
npm test             # 运行单元测试
```

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Electron | 28.0.0 |
| 构建工具 | electron-vite | 1.0.27 |
| 打包工具 | electron-builder | 24.6.3 |
| 前端框架 | Vue | 3.3.4 |
| UI 组件库 | Element Plus | 2.4.3 |
| 富文本编辑 | Tiptap | 2.1.0 |
| 状态管理 | Pinia | 2.1.7 |
| 开发语言 | TypeScript | 5.1.6 |
| 样式 | Less | 4.2.0 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👏 致谢

- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Tiptap](https://tiptap.dev/) - 可扩展的富文本编辑器
- [Element Plus](https://element-plus.org/) - Vue 3 UI 组件库
- [electron-vite](https://electron-vite.org/) - Electron Vite 插件
