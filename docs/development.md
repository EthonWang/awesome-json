# 开发指南

## 项目结构

- `src/pages/`：编辑器与 JSON Diff 页面。
- `src/components/ui/`：基于 shadcn/ui 和 Radix UI 的基础组件。
- `src/components/CodeEditor.jsx`：CodeMirror 编辑器封装。
- `src/components/JsonTree.jsx`：JSON 树形查看封装。
- `src/components/CustomSearchPanel.js`：CodeMirror 搜索替换面板。
- `src/lib/`：剪贴板、滚动和共享样式等公共工具。
- `src/utils/`：JSON 处理、差异比较与示例数据。
- `tests/`：公共工具的回归测试。

## 组件与样式约定

优先使用组件公开配置、主题变量和扩展接口。通用布局使用 Tailwind 工具类，基础交互复用 `src/components/ui/` 中的组件。确有项目展示需求时，可以封装公共样式；避免依赖第三方组件的内部 DOM 结构或使用强制覆盖。

按钮通过 `variant`、`size` 和 `tooltip` 配置外观及功能说明。提示使用统一 Tooltip，延迟在 `TooltipProvider` 中配置，避免使用浏览器原生 `title`。CodeMirror 管理的搜索面板控件通过 `tooltip-control.jsx` 接入同一套提示组件，并在面板销毁时清理。

- `src/styles.css`：Tailwind 入口及语义主题映射。
- `src/styles/theme.css`：公共颜色、字体、语法颜色与全局基础规则。
- `src/lib/workspaceStyles.js`：共享容器和标题的 Tailwind 类名组合。
- `src/styles/editor.css`：编辑器外层容器布局；编辑器内部样式使用 `EditorView.theme` 配置。
- `src/styles/diff.css`：差异语义颜色、语法高亮和连续差异边框。
- `src/styles/viewer.css`：JSON 查看组件提供的主题变量。
- `components.json`：shadcn/ui 组件配置。

## 字体与主题

字体规范定义在 `src/styles/theme.css`，通过 Tailwind 语义字号类引用：

| 类名 | 用途 | 默认字号 |
| :--- | :--- | :--- |
| `text-caption` | 辅助信息 | 12px |
| `text-action` | 按钮与操作 | 13px |
| `text-body` | 正文 | 14px |
| `text-code` | 等宽代码 | 15px |
| `text-title` | 标题 | 16px |
| `text-brand` | 品牌 | 20px |

辅助文字使用 `text-muted-foreground`，常规文字使用默认字重，操作与标题使用 600，重点信息使用 700。编辑器与搜索面板复用公共字体变量；编辑器、JSON 树和 Diff 代码引用公共语法颜色变量。

## 验证

```bash
npm run build
node --test tests/*.test.js
git diff --check
```

涉及交互或布局的改动还应在浏览器中检查相关页面、键盘操作和响应式布局。
