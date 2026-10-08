<div align="center">

<img src="./docs/images/logo.svg" width="80" alt="Awesome JSON" />

# Awesome JSON

**清晰地编辑 JSON，直观地比较差异。**

一个在浏览器中运行的 JSON 工具，集编辑、格式化、树形查看与差异对比于一体。

<p>
  <a href="#快速开始">快速开始</a> ·
  <a href="#json-编辑器">JSON 编辑器</a> ·
  <a href="#json-diff">差异对比</a> ·
  <a href="./docs/development.md">开发指南</a> ·
  <a href="https://github.com/EthonWang/awesome-json/issues">反馈问题</a>
</p>

<p>
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/shadcn%2Fui-000?logo=shadcnui&logoColor=white" alt="shadcn/ui" />
</p>

</div>

## JSON 编辑器

用于查看、整理和修改 JSON。粘贴接口响应、配置文件或日志片段后，即可在同一工作区完成编辑、校验与搜索替换。

<!-- 在此补充 JSON 编辑器截图。 -->

- **多标签工作区**：同时处理多份 JSON，切换标签页和页面时保留当前内容。
- **代码编辑**：语法高亮、行号、括号匹配、自动补全与节点折叠，底部显示字符数和光标行列。
- **实时校验**：输入时检查 JSON 语法，格式有误时显示错误说明。
- **格式整理**：支持格式化和压缩；自动格式化默认开启，也可以随时关闭。
- **内容处理**：搜索替换、转义、去转义与复制，方便在接口调试和配置编辑之间使用。

**使用方式**：粘贴 JSON → 查看校验状态 → 编辑或整理内容 → 复制结果。自动格式化在停止输入约 800 毫秒后执行，仅处理有效 JSON。

## JSON Diff

用于比较两份 JSON 的内容差异。左右两侧分别输入原始内容和目标内容，对比结果按字段与数组元素展示，适合检查配置变更或接口响应变化。

<!-- 在此补充 JSON Diff 截图。 -->

### 输入与对比

两侧输入区都支持格式化、可视化、复制和清空。「编辑」可以把这一侧的内容带入编辑页面的新标签页，继续处理。

点击「开始对比」生成结果。修改输入后，用「重新对比」更新结果；结果展示时可以收起输入区，腾出更多阅读空间。首次使用可以点击「载入示例」体验。

### 阅读与定位差异

| 差异类型 | 含义（从原始到目标） |
| :--- | :--- |
| <img src="https://img.shields.io/badge/新增-137158?style=flat-square" alt="新增（绿色）" /> | 目标新增字段或数组元素 |
| <img src="https://img.shields.io/badge/缺失-a5444d?style=flat-square" alt="缺失（红色）" /> | 目标缺少原始字段或数组元素 |
| <img src="https://img.shields.io/badge/修改-875817?style=flat-square" alt="修改（琥珀色）" /> | 同类型的值发生变化 |
| <img src="https://img.shields.io/badge/类型变化-7558a6?style=flat-square" alt="类型变化（紫色）" /> | 值的类型发生变化，例如数字变为字符串 |

差异索引支持分类筛选和逐项跳转。点击索引项或结果中的差异行，可以定位对应内容；「上一个 / 下一个」用于连续查看，当前路径与变化说明同步展示。「复制摘要」可复制差异路径和说明。

宽屏下索引位于结果右侧；较窄屏幕下使用可收起的浮动面板。对象比较忽略属性顺序，数组按索引逐项比较。

### 树形可视化

点击任一侧的「可视化」，以树形结构查看 JSON，无需在长文本中寻找对象和数组的边界。

<!-- 在此补充 JSON 树形可视化弹窗截图。 -->

节点支持展开、收起，层级虚线帮助辨认嵌套关系；对象与数组显示项目数量。悬停或键盘聚焦时显示复制按钮，可以复制指定节点及其内容。

> 所有 JSON 处理均在浏览器内完成，无需后端服务。内容仅保留在当前页面会话中，刷新或关闭前请自行保存。

## 快速开始

需要 **Node.js 20.19+ 或 22.12+** 和 npm。

```bash
git clone https://github.com/EthonWang/awesome-json.git
cd awesome-json
npm ci
npm run dev
```

打开终端显示的地址，默认是 **http://localhost:5173**。

在「JSON 编辑」中粘贴内容即可开始；在「JSON Diff」中输入两侧内容后点击「开始对比」，也可以用「载入示例」体验。

<details>
<summary>常用快捷键</summary>

| 快捷键 | 操作 |
| :--- | :--- |
| `Ctrl / ⌘ + F` | 搜索 |
| `Ctrl / ⌘ + H` | 搜索并替换 |
| `Ctrl / ⌘ + Z` | 撤销编辑 |
| `N` / `→` | 下一处差异 |
| `P` / `←` | 上一处差异 |

差异导航在焦点不处于输入框、按钮或弹窗内时生效。

</details>

## 开发与贡献

基于 **React、Vite、CodeMirror、Tailwind CSS 和 shadcn/ui** 构建，JSON 树使用 `@uiw/react-json-view`。

项目结构、样式约定与部署方法见 [开发指南](./docs/development.md)。欢迎提交 [Issue](https://github.com/EthonWang/awesome-json/issues) 或 Pull Request；反馈问题时请附上复现步骤和可公开的示例 JSON。
