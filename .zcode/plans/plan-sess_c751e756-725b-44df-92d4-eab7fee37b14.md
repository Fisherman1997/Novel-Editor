# Novel Editor UI 重设计方案

## 选定方案
- **风格**：经典书房（暖色纸感）
- **操作优化**：右键菜单 + 拖拽排序 + 快捷键增强 + 面板折叠

---

## 一、视觉风格

### 配色方案

| 用途 | 色值 | 说明 |
|------|------|------|
| 背景 | `#f5f0e8` | 羊皮纸色 |
| 编辑区 | `#fdf8f0` | 暖白纸张 |
| 正文文字 | `#3e2723` | 深棕 |
| 次要文字 | `#6d4c41` | 中棕 |
| 强调色 | `#8d6e63` | 棕红（按钮/链接/焦点） |
| 悬停色 | `#a1887f` | 浅棕 |
| 侧栏背景 | `#4e342e` | 深木色 |
| 侧栏文字 | `#efebe9` | 暖白 |
| 侧栏选中 | `#d7ccc8` | 暖灰 |
| 边框色 | `#d7ccc8` | 暖灰边框 |
| 危险色 | `#c62828` | 暗红（删除） |
| 脏标记 | `#ff8f00` | 琥珀色 |

### 字体

- **编辑器正文**：`"Noto Serif SC", "Source Han Serif CN", "宋体", serif`（衬线体，仿书页）
- **UI 界面**：`"Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif`
- **圆角**：6px（按钮）/ 8px（对话框）/ 2px（内联编辑）
- **阴影**：`0 2px 8px rgba(62,39,35,.1)`（对话框）

---

## 二、操作优化

### 1. 右键上下文菜单

新建通用 `ContextMenu` 组件（absolute 定位 + click-outside 关闭）。

| 触发位置 | 菜单项 |
|----------|--------|
| 编辑器正文 | 剪切/复制/粘贴 ─ 加粗/斜体/高亮 ─ 添加标注 ─ 插入链接 |
| 章节列表项 | 重命名/删除/上方插入/下方插入 |
| 卷标题 | 重命名/编辑说明/删除卷/上方插入/下方插入 |
| 人物列表项 | 编辑详情/删除/复制 |
| 世界观列表项 | 编辑详情/删除/复制 |

### 2. 拖拽排序

使用 `@vueuse/core` 的 `useDraggable`。

- 左侧卷/章列表：卷内章节可拖拽，卷本身也可拖拽
- 右侧人物/世界观列表
- 拖拽时显示插入线，结束后更新 store + markDirty

### 3. 快捷键增强

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+N` | 新建书 |
| `Ctrl+Shift+S` | 另存为 |
| `Ctrl+E` | 导出 |
| `Ctrl+Shift+F` | 全局搜索（全书范围） |
| `Ctrl+Shift+H` | 切换右侧面板 |
| `Ctrl+\` | 切换左侧导航 |
| `Ctrl+Shift+E` | 全屏编辑（隐藏左右面板） |
| `F2` | 重命名当前章节 |
| `Delete` | 删除当前章节（确认） |
| `Ctrl+D` | 复制当前章节 |

### 4. 面板折叠/隐藏

- **左侧导航**：250px ↔ 48px（图标条）或完全隐藏，左上角 ◀/▶ 切换
- **右侧面板**：300px ↔ 0（隐藏）或 48px（图标条），边缘手柄切换
- **全屏模式**：`Ctrl+Shift+E` 隐藏左右面板，`Escape` 退出

---

## 三、新建文件

| 文件 | 用途 |
|------|------|
| `src/renderer/src/styles/variables.less` | 设计 token（颜色/字体/间距） |
| `src/renderer/src/styles/global.less` | 全局重置 + 字体声明 + 滚动条 |
| `src/renderer/src/components/common/ContextMenu.vue` | 通用右键菜单 |
| `src/renderer/src/composables/useContextMenu.ts` | 右键菜单状态 |
| `src/renderer/src/composables/usePanelCollapse.ts` | 面板折叠逻辑 |

---

## 四、修改文件

| 文件 | 变更内容 |
|------|----------|
| `App.vue` | 引入全局样式，面板折叠容器 |
| `main.ts` | 引入 global.less，全局快捷键注册 |
| `AppHeader.vue` | 深木色背景 + 折叠按钮 + 快捷键提示 |
| `AppLeftNav.vue` | 深木色侧栏 + 折叠态 + 右键菜单 + 拖拽排序 |
| `AppRight.vue` | 暖灰侧栏 + 折叠态 |
| `TiptapEditor.vue` | 纸感背景 + 衬线字体 + 右键菜单 |
| `EditorToolbar.vue` | 复古工具栏样式 |
| `CharacterList.vue` | 右键菜单 + 拖拽排序 |
| `WorldViewList.vue` | 右键菜单 + 拖拽排序 |
| `AnnotationList.vue` | 样式更新 |
| 所有 Dialog | 暖色调对话框 |
| `InlineEdit.vue` | 暖色内联编辑 |
| `store/main.ts` | 添加面板折叠状态 |
| `composables/index.ts` | 导出新 composables |

---

## 五、实施顺序（共 11 天）

| 阶段 | 天数 | 内容 |
|------|------|------|
| Phase 1 | 2 | 样式基础设施（variables.less + global.less） |
| Phase 2 | 3 | 经典书房风格（所有组件换肤） |
| Phase 3 | 3 | 右键菜单 + 面板折叠 |
| Phase 4 | 2 | 拖拽排序 |
| Phase 5 | 1 | 快捷键增强 |

---

## 六、验证方式

1. `npm run typecheck` 通过
2. `npm test` 通过
3. 视觉检查：暖色调正确、纸感背景、深木色侧栏
4. 操作验证：右键菜单、拖拽排序、快捷键、面板折叠/全屏