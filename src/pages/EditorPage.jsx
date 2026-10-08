import { copyText } from "@/lib/clipboard";
import { surface, paneHeading, fileEmblem } from "@/lib/workspaceStyles";
import { cn } from "@/lib/utils";
import { WithTooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Braces,
  Check,
  Clipboard,
  FileJson,
  Minimize2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import CodeEditor from "../components/CodeEditor.jsx";
import {
  addEscaping,
  jsonError,
  parseJsonInput,
  removeEscaping,
} from "../utils/jsonActions.js";

export default function EditorPage({ ref, showToast, onDirty, active = true }) {
  const [tabs, setTabs] = useState([
    {
      id: 1,
      title: "Tab 1",
      content: "",
      error: "",
      cursor: { line: 1, column: 1 },
    },
  ]);
  const [activeId, setActiveId] = useState(1);
  const [autoFormat, setAutoFormat] = useState(true);
  const notifiedErrors = useRef(new Set());
  const nextId = useRef(2);
  const editors = useRef(new Map());
  const timers = useRef(new Map());
  const currentTab = tabs.find((tab) => tab.id === activeId) || tabs[0];
  const cursor = currentTab.cursor || { line: 1, column: 1 };

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  useEffect(() => {
    if (active)
      requestAnimationFrame(() => editors.current.get(activeId)?.measure());
  }, [active, activeId]);

  useEffect(() => {
    if (!currentTab.error) {
      notifiedErrors.current.delete(currentTab.id);
      return;
    }
    if (!active || notifiedErrors.current.has(currentTab.id)) return;
    const timer = setTimeout(() => {
      notifiedErrors.current.add(currentTab.id);
      showToast(currentTab.error, "error");
    }, 1200);
    return () => clearTimeout(timer);
  }, [active, currentTab.id, currentTab.content, currentTab.error, showToast]);

  const setTabContent = useCallback((id, content) => {
    setTabs((current) =>
      current.map((tab) =>
        tab.id === id ? { ...tab, content, error: jsonError(content) } : tab,
      ),
    );
  }, []);

  const setCursor = useCallback((id, line, column) => {
    setTabs((current) => {
      const tab = current.find((item) => item.id === id);
      if (!tab || (tab.cursor?.line === line && tab.cursor?.column === column))
        return current;
      return current.map((item) =>
        item.id === id ? { ...item, cursor: { line, column } } : item,
      );
    });
  }, []);

  const onEditorChange = (id, content) => {
    setTabContent(id, content);
    onDirty();
    clearTimeout(timers.current.get(id));
    if (!autoFormat) return;
    const parsed = parseJsonInput(content);
    if (!parsed.ok) return;
    timers.current.set(
      id,
      setTimeout(() => {
        setTabs((current) =>
          current.map((tab) => {
            if (tab.id !== id || tab.content !== content) return tab;
            const formatted = JSON.stringify(parsed.value, null, 2);
            return formatted === content
              ? tab
              : { ...tab, content: formatted, error: "" };
          }),
        );
      }, 800),
    );
  };

  const addTab = (content = "") => {
    const id = nextId.current++;
    setTabs((current) => [
      ...current,
      {
        id,
        title: "Tab " + id,
        content,
        error: jsonError(content),
        cursor: { line: 1, column: 1 },
      },
    ]);
    setActiveId(id);
  };

  useImperativeHandle(ref, () => ({ openTab: addTab }));

  const closeTab = (id) => {
    if (tabs.length <= 1) return;
    const index = tabs.findIndex((tab) => tab.id === id);
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    editors.current.delete(id);
    const remaining = tabs.filter((tab) => tab.id !== id);
    setTabs(remaining);
    if (id === activeId)
      setActiveId(remaining[Math.min(index, remaining.length - 1)].id);
  };

  const updateActive = (content) => {
    clearTimeout(timers.current.get(activeId));
    setTabContent(activeId, content);
    onDirty();
  };

  const transform = (mode) => {
    const parsed = parseJsonInput(currentTab.content);
    if (!parsed.ok) {
      showToast(parsed.message, parsed.kind);
      return;
    }
    updateActive(JSON.stringify(parsed.value, null, mode === "format" ? 2 : 0));
    showToast(
      mode === "format" ? "已格式化当前 JSON。" : "已压缩当前 JSON。",
      "success",
    );
  };

  const validate = () => {
    const parsed = parseJsonInput(currentTab.content);
    if (!parsed.ok) {
      showToast(parsed.message, parsed.kind);
      return;
    }
    showToast("JSON 格式正确。", "success");
  };

  const copy = async () => {
    try {
      await copyText(currentTab.content);
      showToast("已复制当前标签页的内容。", "success");
    } catch {
      showToast("自动复制失败，请选中内容后按 Ctrl/Cmd+C 复制。", "error");
    }
  };

  return (
    <div className="editor-page">
      <h1 className="sr-only">JSON 编辑器</h1>
      <div className="block">
        <section
          className={cn(
            surface,
            "flex h-[calc(100dvh-var(--app-header-height)-30px)] min-h-[520px] flex-col max-[760px]:h-[calc(100dvh-var(--app-header-height)-16px)] max-[760px]:min-h-[480px]",
          )}
          aria-label="JSON 编辑器"
        >
          <Tabs
            className="flex min-h-0 flex-1 flex-col"
            value={String(activeId)}
            onValueChange={(value) => setActiveId(Number(value))}
          >
            <div className="flex h-11 flex-none items-stretch border-b border-border bg-[#f7fafc]">
              <TabsList
                className="[scrollbar-width:thin]"
                aria-label="编辑器标签页"
              >
                {tabs.map((tab) => (
                  <div
                    className={cn(
                      "flex flex-none items-stretch border-r border-border bg-[#f2f7fa]",
                      tab.id === activeId &&
                        "bg-white shadow-[inset_0_-2px_0_var(--blue)]",
                    )}
                    key={tab.id}
                  >
                    <TabsTrigger
                      className="min-w-0 max-w-[165px] gap-[7px] px-3.5 text-body font-bold text-[#577588] data-[state=active]:text-[#264c69]"
                      value={String(tab.id)}
                    >
                      <FileJson
                        aria-hidden="true"
                        size={15}
                        className={tab.error ? "text-destructive" : ""}
                      />
                      <span className="truncate text-body font-semibold">
                        {tab.title}
                      </span>
                    </TabsTrigger>
                    {tabs.length > 1 && (
                      <Button
                        variant="unstyled"
                        className="grid size-8 place-items-center self-center rounded-[5px] border-0 bg-transparent mr-1 text-[#8ba1ad] hover:bg-[#e8eef2] hover:text-[#9d535b]"
                        aria-label={"关闭 " + tab.title}
                        tooltip={`关闭 ${tab.title}`}
                        onClick={() => closeTab(tab.id)}
                      >
                        <X aria-hidden="true" size={13} />
                      </Button>
                    )}
                  </div>
                ))}
              </TabsList>
              <Button
                variant="unstyled"
                className="inline-flex w-11 flex-none items-center justify-center border-0 bg-transparent p-0 text-[#516e80] hover:bg-[#ecf3f8] hover:text-[#315bbe] max-[760px]:w-10"
                aria-label="新建标签页"
                tooltip="新建标签页"
                onClick={() => addTab()}
              >
                <Plus aria-hidden="true" size={18} />
              </Button>
            </div>
            <div className="flex min-h-[52px] flex-none flex-wrap items-center gap-1 border-b border-border px-3.5 py-[7px]">
              <Button
                variant="ghost"
                size="toolbar"
                className={
                  autoFormat
                    ? "bg-[#eaf0ff] text-[#345fbd]"
                    : "bg-[#f0f5f8] text-[#63839a]"
                }
                aria-pressed={autoFormat}
                tooltip="输入停止 800 毫秒后自动格式化有效 JSON"
                onClick={() => setAutoFormat((value) => !value)}
              >
                <Sparkles aria-hidden="true" size={14} /> 自动格式化：
                {autoFormat ? "开" : "关"}
              </Button>
              <span
                className="h-5 flex-none self-center border-l border-[#cbdbe4] mx-1.5 max-[760px]:hidden"
                aria-hidden="true"
              />
              <Button
                variant="ghost"
                size="toolbar"
                tooltip="按缩进整理 JSON，方便阅读"
                onClick={() => transform("format")}
              >
                <Braces aria-hidden="true" size={14} />
                格式化
              </Button>
              <Button
                variant="ghost"
                size="toolbar"
                tooltip="移除 JSON 中多余的空格和换行"
                onClick={() => transform("compress")}
              >
                <Minimize2 aria-hidden="true" size={14} />
                压缩
              </Button>
              <Button
                variant="ghost"
                size="toolbar"
                tooltip="检查 JSON 语法是否正确"
                onClick={validate}
              >
                <Check aria-hidden="true" size={14} />
                校验
              </Button>
              <span
                className="h-5 flex-none self-center border-l border-[#cbdbe4] mx-1.5 max-[760px]:hidden"
                aria-hidden="true"
              />
              <Button
                variant="ghost"
                size="toolbar"
                tooltip="搜索内容；Ctrl/Cmd+F 搜索，Ctrl/Cmd+H 替换"
                onClick={() => editors.current.get(activeId)?.openSearch()}
              >
                <Search aria-hidden="true" size={14} />
                搜索
              </Button>
              <Button
                variant="ghost"
                size="toolbar"
                tooltip="复制当前标签页的全部内容"
                onClick={copy}
              >
                <Clipboard aria-hidden="true" size={14} />
                复制
              </Button>
              <span
                className="h-5 flex-none self-center border-l border-[#cbdbe4] mx-1.5 max-[760px]:hidden"
                aria-hidden="true"
              />
              <Button
                variant="ghost"
                size="toolbar"
                tooltip="移除字符串转义，恢复可读的 JSON"
                onClick={() => updateActive(removeEscaping(currentTab.content))}
              >
                去转义
              </Button>
              <Button
                variant="ghost"
                size="toolbar"
                tooltip="将内容转为带转义字符的字符串"
                onClick={() => updateActive(addEscaping(currentTab.content))}
              >
                转义
              </Button>
              <span
                className="h-5 flex-none self-center border-l border-[#cbdbe4] mx-1.5 max-[760px]:hidden"
                aria-hidden="true"
              />
              <Button
                variant="ghost-destructive"
                size="toolbar"
                tooltip="清空当前标签页的内容"
                onClick={() => updateActive("")}
              >
                <Trash2 aria-hidden="true" size={14} />
                清空
              </Button>
              <span className="flex-1" />
              <WithTooltip content={currentTab.error}>
                <span
                  tabIndex={currentTab.error ? 0 : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap text-action font-semibold max-[420px]:ml-[5px]",
                    currentTab.error
                      ? "text-[#b5535c]"
                      : currentTab.content.trim()
                        ? "text-success"
                        : "text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-[7px] rounded-full",
                      currentTab.error
                        ? "bg-[#c1616b]"
                        : currentTab.content.trim()
                          ? "bg-[#2ca697]"
                          : "bg-[#a9b9c1]",
                    )}
                  />
                  {currentTab.error
                    ? "JSON 格式有误"
                    : currentTab.content.trim()
                      ? "JSON 合法"
                      : "等待输入"}
                </span>
              </WithTooltip>
            </div>
            <div className="min-h-0 flex-1">
              {tabs.map((tab) => (
                <TabsContent
                  forceMount
                  value={String(tab.id)}
                  tabIndex={-1}
                  className="editor-instance h-full w-full"
                  key={tab.id}
                  hidden={tab.id !== activeId}
                >
                  <CodeEditor
                    ref={(api) => {
                      if (api) editors.current.set(tab.id, api);
                      else editors.current.delete(tab.id);
                    }}
                    label={tab.title + " JSON 编辑器"}
                    value={tab.content}
                    onChange={(value) => onEditorChange(tab.id, value)}
                    onCursorChange={(line, column) =>
                      setCursor(tab.id, line, column)
                    }
                    active={active && tab.id === activeId}
                  />
                </TabsContent>
              ))}
            </div>
            <div className="flex min-h-9 flex-none items-center justify-start gap-3 border-t border-border bg-[#fbfdfe] px-[17px] text-caption text-muted-foreground [&_span:last-child]:tabular-nums">
              <span>
                {tabs.length} 个标签页　·　{currentTab.content.length} 字符
              </span>
              <span>
                第 {cursor.line} 行，第 {cursor.column} 列
              </span>
            </div>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
