import { EditorView } from '@codemirror/view'
import { StateEffect } from '@codemirror/state'
import {
  SearchQuery,
  setSearchQuery,
  getSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  closeSearchPanel,
  openSearchPanel,
} from '@codemirror/search'

/**
 * 自定义 StateEffect：通知面板展开替换行
 */
const openReplaceEffect = StateEffect.define()

/**
 * Cmd+H 命令：打开搜索面板并展开替换行
 */
export function openSearchPanelWithReplace(view) {
  openSearchPanel(view)
  // 发送 effect 通知面板展开替换
  view.dispatch({ effects: openReplaceEffect.of(true) })
  return true
}

/**
 * 自定义搜索面板的主题样式，让 panel 容器支持浮层定位
 */
export const searchPanelTheme = EditorView.baseTheme({
  // 让编辑器外层作为定位上下文
  '&': {
    position: 'relative',
  },
  // 顶部 panel 容器透明化，不占空间
  '.cm-panels.cm-panels-top': {
    position: 'absolute',
    top: '0',
    right: '0',
    left: '0',
    zIndex: '100',
    borderBottom: 'none',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  '.cm-panels.cm-panels-top .cm-panel': {
    pointerEvents: 'auto',
  },
  // 隐藏默认搜索面板样式
  '.cm-search.cm-panel': {
    background: 'transparent',
    padding: '0',
    border: 'none',
    overflow: 'visible',
  },
  // 搜索匹配高亮 — 所有匹配项（醒目的橙黄色背景）
  '.cm-searchMatch': {
    backgroundColor: '#FFD54F',
    borderRadius: '2px',
    boxShadow: '0 0 0 1px #F9A825',
  },
  // 当前选中的匹配项（更醒目的橙色背景 + 加粗边框）
  '.cm-searchMatch-selected': {
    backgroundColor: '#FF9800',
    boxShadow: '0 0 0 2px #E65100',
  },
})

/**
 * 创建自定义搜索面板的工厂函数
 */
export function createSearchPanel(view) {
  return new CustomSearchPanel(view)
}

// ─── 样式常量 ───
const COLORS = {
  bg: '#F8F8F8',
  border: '#E0E0E0',
  inputBg: '#FFFFFF',
  inputBorder: '#D0D0D0',
  inputFocusBorder: '#1a73e8',
  inputErrorBorder: '#E53935',
  btnHoverBg: '#E8E8E8',
  toggleActiveBg: '#1a73e8',
  toggleActiveColor: '#FFFFFF',
  toggleColor: '#666666',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  countBg: 'transparent',
  shadow: '0 4px 12px rgba(0,0,0,0.12)',
}

const FONT = "12px Monaco, Menlo, Consolas, 'Courier New', monospace"

class CustomSearchPanel {
  constructor(view) {
    this.view = view

    // 面板状态
    this.caseSensitive = false
    this.regexp = false
    this.wholeWord = false
    this.showReplace = false

    // 匹配计数状态
    this.matchCount = 0
    this.currentMatch = 0
    this.counting = false
    this._countAbortId = 0
    this._internalCommit = false

    // 构建 DOM
    this.dom = this._buildDOM()
    this.top = true

    // 同步已有的搜索状态
    this._syncFromState()
  }

  mount() {
    this.searchInput.focus()
    this.searchInput.select()
  }

  update(viewUpdate) {
    // 检查是否有外部 setSearchQuery effect 或 openReplace effect
    for (const tr of viewUpdate.transactions) {
      for (const effect of tr.effects) {
        if (effect.is(setSearchQuery) && !this._internalCommit) {
          this._syncFromState()
        }
        if (effect.is(openReplaceEffect) && !this.showReplace) {
          this._toggleReplace()
        }
      }
    }
    this._internalCommit = false
    // 文档变化或选区变化时更新计数
    if (viewUpdate.docChanged || viewUpdate.selectionSet) {
      if (viewUpdate.docChanged) {
        this._startAsyncCount()
      } else {
        this._updateCurrentIndex()
      }
    }
  }

  destroy() {
    this._countAbortId++
  }

  // ─── DOM 构建 ───

  _buildDOM() {
    const panel = this._el('div', {
      className: 'cm-custom-search-panel',
      style: `
        position: absolute;
        top: 8px;
        right: 16px;
        z-index: 100;
        width: 420px;
        background: ${COLORS.bg};
        border: 1px solid ${COLORS.border};
        border-radius: 8px;
        box-shadow: ${COLORS.shadow};
        font: ${FONT};
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      `,
    })

    // ── 搜索行 ──
    const searchRow = this._el('div', {
      style: 'display: flex; align-items: center; gap: 4px;',
    })

    // 展开替换的三角按钮
    this.toggleReplaceBtn = this._iconBtn(
      this._chevronSVG(false),
      '展开替换',
      () => this._toggleReplace()
    )
    this.toggleReplaceBtn.style.width = '22px'
    this.toggleReplaceBtn.style.height = '22px'
    this.toggleReplaceBtn.style.flexShrink = '0'
    searchRow.appendChild(this.toggleReplaceBtn)

    // 搜索输入框容器（输入框 + 匹配计数）
    const searchInputWrap = this._el('div', {
      style: `
        flex: 1;
        display: flex;
        align-items: center;
        background: ${COLORS.inputBg};
        border: 1px solid ${COLORS.inputBorder};
        border-radius: 4px;
        padding: 0 6px;
        transition: border-color 0.2s;
        min-width: 0;
      `,
    })
    this.searchInputWrap = searchInputWrap

    this.searchInput = this._el('input', {
      type: 'text',
      placeholder: '搜索',
      'main-field': 'true',
      style: `
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        font: ${FONT};
        color: ${COLORS.textPrimary};
        padding: 4px 0;
        min-width: 0;
      `,
    })
    this.searchInput.addEventListener('input', () => this._onSearchChange())
    this.searchInput.addEventListener('keydown', (e) => this._onSearchKeydown(e))
    this.searchInput.addEventListener('focus', () => {
      searchInputWrap.style.borderColor = COLORS.inputFocusBorder
    })
    this.searchInput.addEventListener('blur', () => {
      this._updateInputBorder()
    })

    // 匹配计数标签
    this.matchLabel = this._el('span', {
      style: `
        font-size: 11px;
        color: ${COLORS.textMuted};
        white-space: nowrap;
        padding: 0 4px;
        user-select: none;
        flex-shrink: 0;
      `,
    })

    searchInputWrap.appendChild(this.searchInput)
    searchInputWrap.appendChild(this.matchLabel)
    searchRow.appendChild(searchInputWrap)

    // Toggle 按钮：Aa, .*, W
    this.caseSensitiveBtn = this._toggleBtn('Aa', '区分大小写', () => {
      this.caseSensitive = !this.caseSensitive
      this._updateToggleStyle(this.caseSensitiveBtn, this.caseSensitive)
      this._commit()
    })
    this.regexpBtn = this._toggleBtn('.*', '正则表达式', () => {
      this.regexp = !this.regexp
      this._updateToggleStyle(this.regexpBtn, this.regexp)
      this._commit()
    })
    this.wholeWordBtn = this._toggleBtn('W', '全词匹配', () => {
      this.wholeWord = !this.wholeWord
      this._updateToggleStyle(this.wholeWordBtn, this.wholeWord)
      this._commit()
    })

    searchRow.appendChild(this.caseSensitiveBtn)
    searchRow.appendChild(this.regexpBtn)
    searchRow.appendChild(this.wholeWordBtn)

    // 上一个 / 下一个 / 关闭
    const prevBtn = this._iconBtn(this._arrowUpSVG(), '上一个 (Shift+Enter)', () => {
      findPrevious(this.view)
      this.view.focus()
    })
    const nextBtn = this._iconBtn(this._arrowDownSVG(), '下一个 (Enter)', () => {
      findNext(this.view)
      this.view.focus()
    })
    const closeBtn = this._iconBtn(this._closeSVG(), '关闭 (Esc)', () => {
      closeSearchPanel(this.view)
      this.view.focus()
    })

    searchRow.appendChild(prevBtn)
    searchRow.appendChild(nextBtn)
    searchRow.appendChild(closeBtn)

    panel.appendChild(searchRow)

    // ── 替换行（默认隐藏）──
    this.replaceRow = this._el('div', {
      style: `
        display: none;
        align-items: center;
        gap: 4px;
        padding-left: 26px;
        overflow: hidden;
        transition: all 0.15s ease;
      `,
    })

    const replaceInputWrap = this._el('div', {
      style: `
        flex: 1;
        display: flex;
        align-items: center;
        background: ${COLORS.inputBg};
        border: 1px solid ${COLORS.inputBorder};
        border-radius: 4px;
        padding: 0 6px;
        transition: border-color 0.2s;
        min-width: 0;
      `,
    })
    this.replaceInputWrap = replaceInputWrap

    this.replaceInput = this._el('input', {
      type: 'text',
      placeholder: '替换',
      style: `
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        font: ${FONT};
        color: ${COLORS.textPrimary};
        padding: 4px 0;
        min-width: 0;
      `,
    })
    this.replaceInput.addEventListener('input', () => this._commit())
    this.replaceInput.addEventListener('keydown', (e) => this._onReplaceKeydown(e))
    this.replaceInput.addEventListener('focus', () => {
      replaceInputWrap.style.borderColor = COLORS.inputFocusBorder
    })
    this.replaceInput.addEventListener('blur', () => {
      replaceInputWrap.style.borderColor = COLORS.inputBorder
    })

    replaceInputWrap.appendChild(this.replaceInput)
    this.replaceRow.appendChild(replaceInputWrap)

    // 替换当前 / 替换全部
    const replaceBtn = this._iconBtn(this._replaceSVG(), '替换当前', () => {
      replaceNext(this.view)
      this.view.focus()
    })
    const replaceAllBtn = this._iconBtn(this._replaceAllSVG(), '替换全部', () => {
      replaceAll(this.view)
      this.view.focus()
    })

    this.replaceRow.appendChild(replaceBtn)
    this.replaceRow.appendChild(replaceAllBtn)

    panel.appendChild(this.replaceRow)

    return panel
  }

  // ─── 逻辑方法 ───

  _onSearchChange() {
    clearTimeout(this._searchDebounce)
    this._searchDebounce = setTimeout(() => {
      this._commit()
    }, 150)
  }

  _onSearchKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      findNext(this.view)
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      findPrevious(this.view)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeSearchPanel(this.view)
      this.view.focus()
    }
  }

  _onReplaceKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      replaceNext(this.view)
      this.view.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeSearchPanel(this.view)
      this.view.focus()
    }
  }

  _commit() {
    const query = new SearchQuery({
      search: this.searchInput.value,
      caseSensitive: this.caseSensitive,
      regexp: this.regexp,
      wholeWord: this.wholeWord,
      replace: this.replaceInput.value,
    })
    if (!query.eq(getSearchQuery(this.view.state))) {
      this._internalCommit = true
      this.view.dispatch({ effects: setSearchQuery.of(query) })
    }
    this._startAsyncCount()
  }

  _syncFromState() {
    const query = getSearchQuery(this.view.state)
    if (this.searchInput.value !== query.search) {
      this.searchInput.value = query.search
    }
    if (this.replaceInput.value !== query.replace) {
      this.replaceInput.value = query.replace
    }
    this.caseSensitive = query.caseSensitive
    this.regexp = query.regexp
    this.wholeWord = query.wholeWord
    this._updateToggleStyle(this.caseSensitiveBtn, this.caseSensitive)
    this._updateToggleStyle(this.regexpBtn, this.regexp)
    this._updateToggleStyle(this.wholeWordBtn, this.wholeWord)
    this._startAsyncCount()
  }

  // ─── 异步分片匹配计数 ───

  _startAsyncCount() {
    const abortId = ++this._countAbortId
    const searchStr = this.searchInput.value
    if (!searchStr) {
      this.matchCount = 0
      this.currentMatch = 0
      this.counting = false
      this._updateMatchLabel()
      this._updateInputBorder()
      return
    }

    this.counting = true
    this._updateMatchLabel()

    const query = getSearchQuery(this.view.state)
    if (!query.valid) {
      this.matchCount = 0
      this.currentMatch = 0
      this.counting = false
      this.matchLabel.textContent = '无效正则'
      this.matchLabel.style.color = COLORS.inputErrorBorder
      this._updateInputBorder()
      return
    }

    const state = this.view.state
    const cursor = query.getCursor(state)
    const selFrom = state.selection.main.from
    const selTo = state.selection.main.to

    let count = 0
    let currentIdx = 0
    let found = false

    const processChunk = () => {
      if (abortId !== this._countAbortId) return

      const chunkSize = 2000
      for (let i = 0; i < chunkSize; i++) {
        const result = cursor.next()
        if (result.done) {
          // 完成
          this.matchCount = count
          this.currentMatch = found ? currentIdx : 0
          this.counting = false
          this._updateMatchLabel()
          this._updateInputBorder()
          return
        }
        count++
        // 检查当前选区是否精确匹配此结果
        if (!found && result.value.from === selFrom && result.value.to === selTo) {
          currentIdx = count
          found = true
        }
      }

      // 继续下一个分片
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(processChunk, { timeout: 50 })
      } else {
        setTimeout(processChunk, 0)
      }
    }

    // 启动第一个分片
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(processChunk, { timeout: 50 })
    } else {
      setTimeout(processChunk, 0)
    }
  }

  _updateCurrentIndex() {
    if (!this.searchInput.value || this.counting) return
    const query = getSearchQuery(this.view.state)
    if (!query.valid || !query.search) return

    const state = this.view.state
    const cursor = query.getCursor(state)
    const selFrom = state.selection.main.from
    const selTo = state.selection.main.to

    let count = 0
    let found = false
    let currentIdx = 0

    // 如果已有 matchCount，只需找到当前索引
    const hasTotal = this.matchCount > 0

    while (true) {
      const result = cursor.next()
      if (result.done) break
      count++
      if (!found && result.value.from === selFrom && result.value.to === selTo) {
        currentIdx = count
        found = true
        if (hasTotal) {
          this.currentMatch = currentIdx
          this._updateMatchLabel()
          return
        }
      }
    }
    this.matchCount = count
    this.currentMatch = found ? currentIdx : 0
    this._updateMatchLabel()
    this._updateInputBorder()
  }

  _updateMatchLabel() {
    if (!this.searchInput.value) {
      this.matchLabel.textContent = ''
      this.matchLabel.style.color = COLORS.textMuted
      return
    }
    if (this.counting) {
      this.matchLabel.textContent = '计算中...'
      this.matchLabel.style.color = COLORS.textMuted
      return
    }
    if (this.matchCount === 0) {
      this.matchLabel.textContent = '无结果'
      this.matchLabel.style.color = COLORS.inputErrorBorder
      return
    }
    if (this.currentMatch > 0) {
      this.matchLabel.textContent = `${this.currentMatch} / ${this.matchCount}`
    } else {
      this.matchLabel.textContent = `${this.matchCount} 个结果`
    }
    this.matchLabel.style.color = COLORS.textMuted
  }

  _updateInputBorder() {
    if (this.searchInput === document.activeElement) return
    if (this.searchInput.value && !this.counting && this.matchCount === 0) {
      this.searchInputWrap.style.borderColor = COLORS.inputErrorBorder
    } else {
      this.searchInputWrap.style.borderColor = COLORS.inputBorder
    }
  }

  _toggleReplace() {
    this.showReplace = !this.showReplace
    this.replaceRow.style.display = this.showReplace ? 'flex' : 'none'
    this.toggleReplaceBtn.innerHTML = ''
    this.toggleReplaceBtn.appendChild(this._chevronSVG(this.showReplace))
    if (this.showReplace) {
      this.replaceInput.focus()
    }
  }

  // ─── Toggle 按钮样式 ───

  _updateToggleStyle(btn, active) {
    if (active) {
      btn.style.background = COLORS.toggleActiveBg
      btn.style.color = COLORS.toggleActiveColor
      btn.style.borderColor = COLORS.toggleActiveBg
    } else {
      btn.style.background = 'transparent'
      btn.style.color = COLORS.toggleColor
      btn.style.borderColor = COLORS.border
    }
  }

  // ─── DOM 辅助工具 ───

  _el(tag, attrs) {
    const el = document.createElement(tag)
    if (attrs) {
      for (const [key, val] of Object.entries(attrs)) {
        if (key === 'style') {
          el.style.cssText = val
        } else if (key === 'className') {
          el.className = val
        } else {
          el.setAttribute(key, val)
        }
      }
    }
    return el
  }

  _toggleBtn(text, title, onClick) {
    const btn = this._el('button', {
      title,
      style: `
        width: 26px;
        height: 22px;
        border: 1px solid ${COLORS.border};
        border-radius: 4px;
        background: transparent;
        color: ${COLORS.toggleColor};
        font: bold 11px ${FONT.split(',')[0]}, monospace;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        flex-shrink: 0;
        padding: 0;
        line-height: 1;
      `,
    })
    btn.textContent = text
    btn.addEventListener('click', onClick)
    btn.addEventListener('mouseenter', () => {
      if (btn.style.background === 'transparent') {
        btn.style.background = COLORS.btnHoverBg
      }
    })
    btn.addEventListener('mouseleave', () => {
      // Restore based on active state
      const isActive =
        (btn === this.caseSensitiveBtn && this.caseSensitive) ||
        (btn === this.regexpBtn && this.regexp) ||
        (btn === this.wholeWordBtn && this.wholeWord)
      if (!isActive) {
        btn.style.background = 'transparent'
      }
    })
    return btn
  }

  _iconBtn(svgEl, title, onClick) {
    const btn = this._el('button', {
      title,
      style: `
        width: 26px;
        height: 22px;
        border: none;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease;
        flex-shrink: 0;
        padding: 0;
      `,
    })
    btn.appendChild(svgEl)
    btn.addEventListener('click', onClick)
    btn.addEventListener('mouseenter', () => {
      btn.style.background = COLORS.btnHoverBg
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent'
    })
    return btn
  }

  // ─── SVG 图标 ───

  _chevronSVG(expanded) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '14')
    svg.setAttribute('height', '14')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('fill', 'none')
    svg.style.transition = 'transform 0.15s ease'
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M6 4l4 4-4 4')
    path.setAttribute('stroke', COLORS.textSecondary)
    path.setAttribute('stroke-width', '1.5')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    svg.appendChild(path)
    if (expanded) {
      svg.style.transform = 'rotate(90deg)'
    }
    return svg
  }

  _arrowUpSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '14')
    svg.setAttribute('height', '14')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('fill', 'none')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M8 12V4M4 7l4-3.5L12 7')
    path.setAttribute('stroke', COLORS.textSecondary)
    path.setAttribute('stroke-width', '1.5')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    svg.appendChild(path)
    return svg
  }

  _arrowDownSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '14')
    svg.setAttribute('height', '14')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('fill', 'none')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M8 4v8M4 9l4 3.5L12 9')
    path.setAttribute('stroke', COLORS.textSecondary)
    path.setAttribute('stroke-width', '1.5')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    svg.appendChild(path)
    return svg
  }

  _closeSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '14')
    svg.setAttribute('height', '14')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('fill', 'none')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M4 4l8 8M12 4l-8 8')
    path.setAttribute('stroke', COLORS.textSecondary)
    path.setAttribute('stroke-width', '1.5')
    path.setAttribute('stroke-linecap', 'round')
    svg.appendChild(path)
    return svg
  }

  _replaceSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '14')
    svg.setAttribute('height', '14')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('fill', 'none')
    // Simple replace icon: single arrow swap
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M3 5h8l-2.5-2.5M13 11H5l2.5 2.5')
    path.setAttribute('stroke', COLORS.textSecondary)
    path.setAttribute('stroke-width', '1.5')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    svg.appendChild(path)
    return svg
  }

  _replaceAllSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '14')
    svg.setAttribute('height', '14')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('fill', 'none')
    // Double arrow for replace all
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path1.setAttribute('d', 'M2 4h8l-2-2M14 7H6l2 2')
    path1.setAttribute('stroke', COLORS.textSecondary)
    path1.setAttribute('stroke-width', '1.5')
    path1.setAttribute('stroke-linecap', 'round')
    path1.setAttribute('stroke-linejoin', 'round')
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path2.setAttribute('d', 'M2 10h8l-2-2M14 13H6l2 2')
    path2.setAttribute('stroke', COLORS.textSecondary)
    path2.setAttribute('stroke-width', '1.5')
    path2.setAttribute('stroke-linecap', 'round')
    path2.setAttribute('stroke-linejoin', 'round')
    svg.appendChild(path1)
    svg.appendChild(path2)
    return svg
  }
}
