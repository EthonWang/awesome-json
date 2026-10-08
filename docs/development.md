# 开发指南

## 项目结构

- `src/pages/`：编辑器与 JSON Diff 页面。
- `src/components/ui/`：基于 shadcn/ui 和 Radix UI 的基础组件。
- `src/components/CodeEditor.jsx`：CodeMirror 编辑器封装。
- `src/components/JsonTree.jsx`：JSON 树形查看封装。
- `src/components/CustomSearchPanel.js`：CodeMirror 搜索替换面板。
- `src/lib/`：剪贴板、滚动和共享样式等公共工具。
- `src/i18n/`：国际化配置及按功能拆分的语言包。
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

## 多语言

界面使用 i18next、react-i18next 和浏览器语言检测插件，支持简体中文与英文。右上角菜单可即时切换语言；选择保存在 `localStorage` 的 `awesome-json-language` 中。首次使用读取浏览器语言，中文地区变体统一映射到 `zh-CN`，不支持的语言回退为中文。页面 `lang` 属性同步更新。

语言包位于 `src/i18n/locales/<语言>/`，按 `common`、`editor`、`diff`、`search` 分组。React 组件通过 `useTranslation()` 获取 `t`，使用语义键及插值，例如 `t("editor:cursor", { line, column })`。数量文案使用 i18next 的 `_one` / `_other` 复数形式，避免拼接句子。

新增语言时：

1. 在 `src/i18n/locales/` 新建语言目录，补齐四个 JSON 文件，并按该语言的规则添加复数形式。
2. 在 `src/i18n/index.js` 的 `supportedLanguages` 中登记语言代码、原生名称和窄屏简称。语言包自动导入，菜单自动增加选项。
3. 运行测试并检查长文案、移动端和键盘操作；若新语言的复数类别不同，相应调整语言包键对齐测试。

切换语言不重建工作区。错误提示和 Toast 保存消息键与参数，差异记录保存描述键及参数，在展示或复制摘要时翻译。CodeMirror 搜索面板监听语言变化，在原 DOM 上更新输入提示、按钮、Tooltip 和计数，并在销毁时取消监听。JSON 键名、值、路径和示例数据作为用户内容保留原样。

## 验证

```bash
npm run build
node --test tests/*.test.js
git diff --check
```

涉及交互或布局的改动还应在浏览器中检查相关页面、键盘操作和响应式布局。

## 构建与部署

运行 `npm run build` 生成 `dist/`，使用 `npm run preview` 在本地预览生产构建。部署时将 `dist/` 内容上传到静态站点服务即可。

项目使用 Hash 路由（`/#/` 和 `/#/diff`），无需为页面路由配置服务端重写。如果部署到子路径，例如 GitHub Pages 的 `/awesome-json/`，构建时指定资源路径：

```bash
npm run build -- --base=/awesome-json/
```
