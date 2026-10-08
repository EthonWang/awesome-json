import i18n from "@/i18n";
import {
  ArrowUp,
  ArrowDown,
  ChevronRight,
  X,
  Replace,
  ReplaceAll,
} from "lucide-react";
import { createTooltipControl } from "./ui/tooltip-control.jsx";
import { EditorView } from "@codemirror/view";
import { openReplaceEffect, searchPanelState } from "../lib/searchPanelState.js";
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
} from "@codemirror/search";

/**
 * 自定义 StateEffect：通知面板展开替换行
 */


/**
 * Cmd+H 命令：打开搜索面板并展开替换行
 */
export function openSearchPanelWithReplace(view) {
  openSearchPanel(view);
  // 发送 effect 通知面板展开替换
  view.dispatch({ effects: openReplaceEffect.of(true) });
  return true;
}

/**
 * 自定义搜索面板的主题样式，让 panel 容器支持浮层定位
 */
export const searchPanelTheme = EditorView.baseTheme({
  // 让编辑器外层作为定位上下文
  "&": {
    position: "relative",
  },
  // 顶部 panel 容器透明化，不占空间
  ".cm-panels.cm-panels-top": {
    position: "absolute",
    top: "0",
    right: "0",
    left: "0",
    zIndex: "100",
    borderBottom: "none",
    backgroundColor: "transparent",
    pointerEvents: "none",
  },
  ".cm-panels.cm-panels-top .cm-panel": {
    pointerEvents: "auto",
  },
  // 隐藏默认搜索面板样式
  ".cm-search.cm-panel": {
    background: "transparent",
    padding: "0",
    border: "none",
    overflow: "visible",
  },
  // 搜索匹配高亮 — 所有匹配项（醒目的橙黄色背景）
  ".cm-searchMatch": {
    backgroundColor: "#ffe1a8",
    borderRadius: "2px",
    boxShadow: "0 0 0 1px #d5a552",
  },
  // 当前选中的匹配项（更醒目的橙色背景 + 加粗边框）
  ".cm-searchMatch-selected": {
    backgroundColor: "#f5ba68",
    boxShadow: "0 0 0 2px #bd7a2c",
  },
  ".cm-custom-search-panel": {
    position: "absolute",
    top: "8px",
    right: "16px",
    zIndex: "100",
    width: "min(420px, calc(100% - 32px))",
    background: "var(--surface)",
    border: "1px solid #D2E0E9",
    borderRadius: "8px",
    boxShadow: "0 12px 32px rgba(24,54,75,0.15)",
    font: "var(--type-action) var(--ui)",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  ".cm-search-row": { display: "flex", alignItems: "center", gap: "4px" },
  ".cm-search-input-wrap": {
    flex: "1",
    display: "flex",
    alignItems: "center",
    background: "#F8FBFD",
    border: "1px solid #CBDAE3",
    borderRadius: "4px",
    padding: "0 6px",
    transition: "border-color 0.2s",
    minWidth: "0",
  },
  ".cm-search-input": {
    flex: "1",
    border: "none",
    outline: "none",
    background: "transparent",
    font: "var(--type-action) var(--ui)",
    color: "var(--ink)",
    padding: "4px 0",
    minWidth: "0",
  },
  ".cm-search-count": {
    fontSize: "var(--type-caption)",
    color: "var(--muted)",
    whiteSpace: "nowrap",
    padding: "0 4px",
    userSelect: "none",
    flexShrink: "0",
  },
  ".cm-replace-row": {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    paddingLeft: "26px",
    overflow: "hidden",
    transition:
      "color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
  },
  ".cm-search-toggle": {
    width: "26px",
    height: "22px",
    border: "1px solid #D2E0E9",
    borderRadius: "4px",
    background: "transparent",
    color: "#496578",
    font: "600 var(--type-caption) var(--ui)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition:
      "color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
    flexShrink: "0",
    padding: "0",
    lineHeight: "1",
  },
  ".cm-search-icon": {
    width: "26px",
    height: "22px",
    border: "none",
    borderRadius: "4px",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s ease",
    flexShrink: "0",
    padding: "0",
    color: "#587181",
  },
  ".cm-replace-toggle": { width: "22px" },
  ".cm-search-input-wrap:focus-within": { borderColor: "var(--blue)" },
  '.cm-search-input-wrap[data-error="true"]:not(:focus-within)': {
    borderColor: "var(--coral)",
  },
  '.cm-search-count[data-error="true"]': { color: "var(--coral)" },
  '.cm-search-toggle:hover:not([aria-pressed="true"]), .cm-search-icon:hover': {
    background: "#EDF4F8",
  },
  '.cm-search-toggle[aria-pressed="true"]': {
    background: "var(--blue)",
    color: "var(--surface)",
    borderColor: "var(--blue)",
  },
  ".cm-replace-toggle svg": { transition: "transform 0.15s ease" },
  '.cm-replace-toggle[aria-expanded="true"] svg': {
    transform: "rotate(90deg)",
  },
});

/**
 * 创建自定义搜索面板的工厂函数
 */
export function createSearchPanel(view) {
  return new CustomSearchPanel(view);
}

class CustomSearchPanel {
  constructor(view) {
    this.view = view;
    this.controls = [];

    // 面板状态
    this.caseSensitive = false;
    this.regexp = false;
    this.wholeWord = false;
    this.showReplace = view.state.field(searchPanelState, false) ?? false;

    // 匹配计数状态
    this.matchCount = 0;
    this.currentMatch = 0;
    this.counting = false;
    this._countAbortId = 0;
    this._internalCommit = false;

    // 构建 DOM
    this.dom = this._buildDOM();
    this.onLanguageChange = () => this._translate();
    i18n.on("languageChanged", this.onLanguageChange);
    this.top = true;

    // 同步已有的搜索状态
    this._syncFromState();
  }

  mount() {
    this.searchInput.focus();
    this.searchInput.select();
  }

  update(viewUpdate) {
    // 检查是否有外部 setSearchQuery effect 或 openReplace effect
    for (const tr of viewUpdate.transactions) {
      for (const effect of tr.effects) {
        if (effect.is(setSearchQuery) && !this._internalCommit) {
          this._syncFromState();
        }
        if (effect.is(openReplaceEffect)) {
          this._setReplaceExpanded(effect.value);
        }
      }
    }
    this._internalCommit = false;
    // 文档变化或选区变化时更新计数
    if (viewUpdate.docChanged || viewUpdate.selectionSet) {
      if (viewUpdate.docChanged) {
        this._startAsyncCount();
      } else {
        this._updateCurrentIndex();
      }
    }
  }

  destroy() {
    i18n.off("languageChanged", this.onLanguageChange);
    this._countAbortId++;
    clearTimeout(this._searchDebounce);
    this.controls.forEach((control) => control.destroy());
  }

  // ─── DOM 构建 ───

  _buildDOM() {
    const panel = this._el("div", {
      className: "cm-custom-search-panel",
    });

    // ── 搜索行 ──
    const searchRow = this._el("div", {
      className: "cm-search-row",
    });

    // 展开替换的三角按钮
    this.toggleReplaceBtn = this._iconBtn(
      ChevronRight,
      this.showReplace ? "search:collapseReplace" : "search:expandReplace",
      () => this._toggleReplace(),
      { className: "cm-replace-toggle", expanded: this.showReplace },
    );
    searchRow.appendChild(this.toggleReplaceBtn);

    // 搜索输入框容器（输入框 + 匹配计数）
    const searchInputWrap = this._el("div", {
      className: "cm-search-input-wrap",
    });
    this.searchInputWrap = searchInputWrap;

    this.searchInput = this._el("input", {
      type: "text",
      placeholder: i18n.t("search:placeholder"),
      "aria-label": i18n.t("search:label"),
      name: "json-search",
      autocomplete: "off",
      spellcheck: "false",
      "main-field": "true",
      className: "cm-search-input",
    });
    this.searchInput.addEventListener("input", () => this._onSearchChange());
    this.searchInput.addEventListener("keydown", (e) =>
      this._onSearchKeydown(e),
    );

    // 匹配计数标签
    this.matchLabel = this._el("span", {
      "aria-live": "polite",
      "aria-atomic": "true",
      className: "cm-search-count",
    });

    searchInputWrap.appendChild(this.searchInput);
    searchInputWrap.appendChild(this.matchLabel);
    searchRow.appendChild(searchInputWrap);

    // Toggle 按钮：Aa, .*, W
    this.caseSensitiveBtn = this._toggleBtn("Aa", "search:caseSensitive", () => {
      this.caseSensitive = !this.caseSensitive;
      this._updateToggleState(this.caseSensitiveBtn, this.caseSensitive);
      this._commit();
    });
    this.regexpBtn = this._toggleBtn(".*", "search:regexp", () => {
      this.regexp = !this.regexp;
      this._updateToggleState(this.regexpBtn, this.regexp);
      this._commit();
    });
    this.wholeWordBtn = this._toggleBtn("W", "search:wholeWord", () => {
      this.wholeWord = !this.wholeWord;
      this._updateToggleState(this.wholeWordBtn, this.wholeWord);
      this._commit();
    });

    searchRow.appendChild(this.caseSensitiveBtn);
    searchRow.appendChild(this.regexpBtn);
    searchRow.appendChild(this.wholeWordBtn);

    // 上一个 / 下一个 / 关闭
    const prevBtn = this._iconBtn(ArrowUp, "search:previous", () => {
      findPrevious(this.view);
      this.view.focus();
    });
    const nextBtn = this._iconBtn(ArrowDown, "search:next", () => {
      findNext(this.view);
      this.view.focus();
    });
    const closeBtn = this._iconBtn(X, "search:close", () => {
      closeSearchPanel(this.view);
      this.view.focus();
    });

    searchRow.appendChild(prevBtn);
    searchRow.appendChild(nextBtn);
    searchRow.appendChild(closeBtn);

    panel.appendChild(searchRow);

    // ── 替换行（默认隐藏）──
    this.replaceRow = this._el("div", {
      className: "cm-replace-row",
      ...(this.showReplace ? {} : { hidden: "" }),
    });

    const replaceInputWrap = this._el("div", {
      className: "cm-search-input-wrap",
    });
    this.replaceInputWrap = replaceInputWrap;

    this.replaceInput = this._el("input", {
      type: "text",
      placeholder: i18n.t("search:replacePlaceholder"),
      "aria-label": i18n.t("search:replaceLabel"),
      name: "json-replace",
      autocomplete: "off",
      spellcheck: "false",
      className: "cm-search-input",
    });
    this.replaceInput.addEventListener("input", () => this._commit());
    this.replaceInput.addEventListener("keydown", (e) =>
      this._onReplaceKeydown(e),
    );

    replaceInputWrap.appendChild(this.replaceInput);
    this.replaceRow.appendChild(replaceInputWrap);

    // 替换当前 / 替换全部
    const replaceBtn = this._iconBtn(Replace, "search:replace", () => {
      replaceNext(this.view);
      this.view.focus();
    });
    const replaceAllBtn = this._iconBtn(ReplaceAll, "search:replaceAll", () => {
      replaceAll(this.view);
      this.view.focus();
    });

    this.replaceRow.appendChild(replaceBtn);
    this.replaceRow.appendChild(replaceAllBtn);

    panel.appendChild(this.replaceRow);

    return panel;
  }

  // ─── 逻辑方法 ───

  _onSearchChange() {
    clearTimeout(this._searchDebounce);
    this._searchDebounce = setTimeout(() => {
      this._commit();
    }, 150);
  }

  _onSearchKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      findNext(this.view);
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      findPrevious(this.view);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSearchPanel(this.view);
      this.view.focus();
    }
  }

  _onReplaceKeydown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      replaceNext(this.view);
      this.view.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSearchPanel(this.view);
      this.view.focus();
    }
  }

  _commit() {
    const query = new SearchQuery({
      search: this.searchInput.value,
      caseSensitive: this.caseSensitive,
      regexp: this.regexp,
      wholeWord: this.wholeWord,
      replace: this.replaceInput.value,
    });
    if (!query.eq(getSearchQuery(this.view.state))) {
      this._internalCommit = true;
      this.view.dispatch({ effects: setSearchQuery.of(query) });
    }
    this._startAsyncCount();
  }

  _syncFromState() {
    const query = getSearchQuery(this.view.state);
    if (this.searchInput.value !== query.search) {
      this.searchInput.value = query.search;
    }
    if (this.replaceInput.value !== query.replace) {
      this.replaceInput.value = query.replace;
    }
    this.caseSensitive = query.caseSensitive;
    this.regexp = query.regexp;
    this.wholeWord = query.wholeWord;
    this._updateToggleState(this.caseSensitiveBtn, this.caseSensitive);
    this._updateToggleState(this.regexpBtn, this.regexp);
    this._updateToggleState(this.wholeWordBtn, this.wholeWord);
    this._startAsyncCount();
  }

  // ─── 异步分片匹配计数 ───

  _startAsyncCount() {
    const abortId = ++this._countAbortId;
    const searchStr = this.searchInput.value;
    if (!searchStr) {
      this.matchCount = 0;
      this.currentMatch = 0;
      this.counting = false;
      this._updateMatchLabel();
      this._updateSearchStatus();
      return;
    }

    this.counting = true;
    this._updateMatchLabel();

    const query = getSearchQuery(this.view.state);
    if (!query.valid) {
      this.matchCount = 0;
      this.currentMatch = 0;
      this.counting = false;
      this.matchLabel.textContent = i18n.t("search:invalidRegexp");
      this.matchLabel.dataset.error = "true";
      this._updateSearchStatus();
      return;
    }

    const state = this.view.state;
    const cursor = query.getCursor(state);
    const selFrom = state.selection.main.from;
    const selTo = state.selection.main.to;

    let count = 0;
    let currentIdx = 0;
    let found = false;

    const processChunk = () => {
      if (abortId !== this._countAbortId) return;

      const chunkSize = 2000;
      for (let i = 0; i < chunkSize; i++) {
        const result = cursor.next();
        if (result.done) {
          // 完成
          this.matchCount = count;
          this.currentMatch = found ? currentIdx : 0;
          this.counting = false;
          this._updateMatchLabel();
          this._updateSearchStatus();
          return;
        }
        count++;
        // 检查当前选区是否精确匹配此结果
        if (
          !found &&
          result.value.from === selFrom &&
          result.value.to === selTo
        ) {
          currentIdx = count;
          found = true;
        }
      }

      // 继续下一个分片
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(processChunk, { timeout: 50 });
      } else {
        setTimeout(processChunk, 0);
      }
    };

    // 启动第一个分片
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(processChunk, { timeout: 50 });
    } else {
      setTimeout(processChunk, 0);
    }
  }

  _updateCurrentIndex() {
    if (!this.searchInput.value || this.counting) return;
    const query = getSearchQuery(this.view.state);
    if (!query.valid || !query.search) return;

    const state = this.view.state;
    const cursor = query.getCursor(state);
    const selFrom = state.selection.main.from;
    const selTo = state.selection.main.to;

    let count = 0;
    let found = false;
    let currentIdx = 0;

    // 如果已有 matchCount，只需找到当前索引
    const hasTotal = this.matchCount > 0;

    while (true) {
      const result = cursor.next();
      if (result.done) break;
      count++;
      if (
        !found &&
        result.value.from === selFrom &&
        result.value.to === selTo
      ) {
        currentIdx = count;
        found = true;
        if (hasTotal) {
          this.currentMatch = currentIdx;
          this._updateMatchLabel();
          return;
        }
      }
    }
    this.matchCount = count;
    this.currentMatch = found ? currentIdx : 0;
    this._updateMatchLabel();
    this._updateSearchStatus();
  }

  _updateMatchLabel() {
    if (!this.searchInput.value) {
      this.matchLabel.textContent = "";
      this.matchLabel.dataset.error = "false";
      return;
    }
    if (this.counting) {
      this.matchLabel.textContent = i18n.t("search:counting");
      this.matchLabel.dataset.error = "false";
      return;
    }
    if (this.matchCount === 0) {
      this.matchLabel.textContent = i18n.t("search:noResults");
      this.matchLabel.dataset.error = "true";
      return;
    }
    if (this.currentMatch > 0) {
      this.matchLabel.textContent = `${this.currentMatch} / ${this.matchCount}`;
    } else {
      this.matchLabel.textContent = i18n.t("search:resultCount", { count: this.matchCount });
    }
    this.matchLabel.dataset.error = "false";
  }

  _updateSearchStatus() {
    const error = Boolean(
      this.searchInput.value && !this.counting && this.matchCount === 0,
    );
    this.searchInputWrap.dataset.error = String(error);
    this.searchInput.setAttribute(
      "aria-invalid",
      String(!getSearchQuery(this.view.state).valid),
    );
  }

  _toggleReplace() {
    this.view.dispatch({ effects: openReplaceEffect.of(!this.showReplace) });
  }

  _setReplaceExpanded(expanded) {
    this.showReplace = expanded;
    this.replaceRow.hidden = !this.showReplace;
    this._updateControl(this.toggleReplaceBtn, {
      expanded: this.showReplace,
      label: i18n.t(this.showReplace ? "search:collapseReplace" : "search:expandReplace"),
    });
    if (this.showReplace) {
      this.replaceInput.focus();
    }
  }

  // ─── Toggle 按钮样式 ───

  _updateToggleState(btn, active) {
    this._updateControl(btn, { pressed: active });
  }

  _translate() {
    this.searchInput.placeholder = i18n.t("search:placeholder");
    this.searchInput.setAttribute("aria-label", i18n.t("search:label"));
    this.replaceInput.placeholder = i18n.t("search:replacePlaceholder");
    this.replaceInput.setAttribute("aria-label", i18n.t("search:replaceLabel"));
    this.controls.forEach((control) => control.update({
      label: i18n.t(control.labelKey),
      ...(control.hintKey ? { hint: i18n.t(control.hintKey) } : {}),
    }));
    this._updateControl(this.toggleReplaceBtn, {
      label: i18n.t(this.showReplace ? "search:collapseReplace" : "search:expandReplace"),
    });
    this._startAsyncCount();
  }

  // ─── DOM 辅助工具 ───

  _el(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [key, val] of Object.entries(attrs)) {
        if (key === "className") {
          el.className = val;
        } else {
          el.setAttribute(key, val);
        }
      }
    }
    return el;
  }

  _updateControl(dom, props) {
    this.controls.find((control) => control.dom === dom)?.update(props);
  }

  _toggleBtn(text, label, onClick) {
    const hints = {
      "search:caseSensitive": "search:caseHint",
      "search:regexp": "search:regexpHint",
      "search:wholeWord": "search:wholeWordHint",
    };
    const control = createTooltipControl({
      text,
      label: i18n.t(label),
      hint: i18n.t(hints[label]),
      onClick,
      className: "cm-search-toggle",
      pressed: false,
    });
    control.labelKey = label;
    control.hintKey = hints[label];
    this.controls.push(control);
    return control.dom;
  }

  _iconBtn(Icon, label, onClick, options = {}) {
    const control = createTooltipControl({
      Icon,
      label: i18n.t(label),
      onClick,
      ...options,
      className: `cm-search-icon ${options.className ?? ""}`,
    });
    control.labelKey = label;
    this.controls.push(control);
    return control.dom;
  }
}
