# Awesome JSON

在线 JSON 工具集，支持JSON的编辑、格式刷、DIFF等，基于 Vue 3 + Vuetify 3 构建。

## 功能

### JSON 编辑器

- 多标签页管理，独立编辑互不干扰
- 基于 CodeMirror 6 的语法高亮、括号匹配、代码折叠
- 自动格式化（防抖），可手动格式化/压缩
- 实时校验 JSON 合法性
- 转义/去转义、复制、清空

### JSON Diff

- 左右并排输入，语义级递归对比
- 三种差异类型标记：缺失、类型不同、值不等
- 差异导航跳转，支持按类型筛选
- JSON 树形可视化展示

## 部署

```sh
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建生产版本
npm run build
```

构建产物在 `dist/` 目录，部署到任意静态服务器即可。
