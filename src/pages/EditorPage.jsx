import { translateMessage } from "../i18n/message.js";
import { useTranslation } from "react-i18next";
import { copyText } from "@/lib/clipboard";
import { surface } from "@/lib/workspaceStyles";
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
  ArrowLeftToLine,
  ArrowRightFromLine,
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
  const { t } = useTranslation();
  const [tabs, setTabs] = useState([
    {
      id: 1,

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
        tab.id === id ? { ...tab, content, error: jsonError(content, true) } : tab,
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

        content,
        error: jsonError(content, true),
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
      showToast(parsed.translation, parsed.kind);
      return;
    }
    updateActive(JSON.stringify(parsed.value, null, mode === "format" ? 2 : 0));
    showToast(
      mode === "format" ? { key: "editor:formatted" } : { key: "editor:compressed" },
      "success",
    );
  };

  const validate = () => {
    const parsed = parseJsonInput(currentTab.content);
    if (!parsed.ok) {
      showToast(parsed.translation, parsed.kind);
      return;
    }
    showToast({ key: "editor:validMessage" }, "success");
  };

  const copy = async () => {
    try {
      await copyText(currentTab.content);
      showToast({ key: "editor:copiedTab" }, "success");
    } catch {
      showToast({ key: "common:copyFailed" }, "error");
    }
  };

  return (
    <div className="editor-page">
      <h1 className="sr-only">
        {t("editor:title")}
      </h1>
      <div className="block">
        <section
          className={cn(
            surface,
            "@container/editor flex h-[calc(100dvh-var(--app-header-height)-20px)] min-h-[520px] flex-col max-[760px]:h-[calc(100dvh-var(--app-header-height)-16px)] max-[760px]:min-h-[480px]",
          )}
          aria-label={t("editor:title")}
        >
          <Tabs
            className="flex min-h-0 flex-1 flex-col"
            value={String(activeId)}
            onValueChange={(value) => setActiveId(Number(value))}
          >
            <div className="flex h-[34px] pointer-coarse:min-h-11 flex-none items-stretch border-b border-border bg-[#f7fafc]">
              <TabsList
                className="[scrollbar-width:thin]"
                aria-label={t("editor:tabs")}
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
                      className="min-w-0 max-w-[165px] gap-[7px] px-3 text-action font-semibold text-[#577588] data-[state=active]:text-[#264c69]"
                      value={String(tab.id)}
                    >
                      <FileJson
                        aria-hidden="true"
                        size={15}
                        className={tab.error ? "text-destructive" : ""}
                      />
                      <span className="truncate text-action font-semibold">
                        {t("editor:tab", { number: tab.id })}
                      </span>
                    </TabsTrigger>
                    {tabs.length > 1 && (
                      <Button
                        variant="unstyled"
                        className="grid size-6 pointer-coarse:size-11 place-items-center self-center rounded-[5px] border-0 bg-transparent mr-1 text-[#8ba1ad] hover:bg-[#e8eef2] hover:text-[#9d535b]"
                        aria-label={t("editor:closeTab", { number: tab.id })}
                        tooltip={t("editor:closeTab", { number: tab.id })}
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
                className="inline-flex w-9 pointer-coarse:min-w-11 flex-none items-center justify-center border-0 bg-transparent p-0 text-[#516e80] hover:bg-[#ecf3f8] hover:text-[#315bbe] max-[760px]:w-9"
                aria-label={t("editor:newTab")}
                tooltip={t("editor:newTab")}
                onClick={() => addTab()}
              >
                <Plus aria-hidden="true" size={18} />
              </Button>
            </div>
            <div className="flex min-h-10 flex-none flex-wrap items-center gap-1 border-b border-border px-2 py-[5px] [&_button]:flex-none [&_button]:justify-center [&_button]:min-w-7 pointer-coarse:[&_button]:min-w-11">
              <Button
                variant="ghost"
                size="toolbar"
                className={
                  autoFormat
                    ? "bg-[#eaf0ff] text-[#345fbd]"
                    : "bg-[#f0f5f8] text-[#63839a]"
                }
                aria-pressed={autoFormat}
                aria-label={t("editor:autoFormat", { state: t(autoFormat ? "editor:on" : "editor:off") })}
                tooltip={t("editor:autoFormatHint")}
                onClick={() => setAutoFormat((value) => !value)}
              >
                <Sparkles aria-hidden="true" size={14} />
                <span className="hidden @min-[64rem]/editor:inline">{t("editor:autoFormat", { state: t(autoFormat ? "editor:on" : "editor:off") })}</span>
              </Button>
              <span
                className="h-5 flex-none self-center border-l border-[#cbdbe4] mx-1.5 hidden @min-[64rem]/editor:block"
                aria-hidden="true"
              />
              <Button
                variant="ghost"
                size="toolbar"
                aria-label={t("common:format")}
                tooltip={t("editor:formatHint")}
                onClick={() => transform("format")}
              >
                <Braces aria-hidden="true" size={14} />
                <span className="hidden @min-[64rem]/editor:inline">{t("common:format")}</span>
              </Button>
              <Button
                variant="ghost"
                size="toolbar"
                aria-label={t("editor:compress")}
                tooltip={t("editor:compressHint")}
                onClick={() => transform("compress")}
              >
                <Minimize2 aria-hidden="true" size={14} />
                <span className="hidden @min-[64rem]/editor:inline">{t("editor:compress")}</span>
              </Button>
              <Button
                variant="ghost"
                size="toolbar"
                aria-label={t("editor:validate")}
                tooltip={t("editor:validateHint")}
                onClick={validate}
              >
                <Check aria-hidden="true" size={14} />
                <span className="hidden @min-[64rem]/editor:inline">{t("editor:validate")}</span>
              </Button>
              <span
                className="h-5 flex-none self-center border-l border-[#cbdbe4] mx-1.5 hidden @min-[64rem]/editor:block"
                aria-hidden="true"
              />
              <Button
                variant="ghost"
                size="toolbar"
                aria-label={t("editor:search")}
                tooltip={t("editor:searchHint")}
                onClick={() => editors.current.get(activeId)?.openSearch()}
              >
                <Search aria-hidden="true" size={14} />
                <span className="hidden @min-[64rem]/editor:inline">{t("editor:search")}</span>
              </Button>
              <Button
                variant="ghost"
                size="toolbar"
                aria-label={t("common:copy")}
                tooltip={t("editor:copyHint")}
                onClick={copy}
              >
                <Clipboard aria-hidden="true" size={14} />
                <span className="hidden @min-[64rem]/editor:inline">{t("common:copy")}</span>
              </Button>
              <span
                className="h-5 flex-none self-center border-l border-[#cbdbe4] mx-1.5 hidden @min-[64rem]/editor:block"
                aria-hidden="true"
              />
              <Button
                variant="ghost"
                size="toolbar"
                aria-label={t("editor:unescape")}
                tooltip={t("editor:unescapeHint")}
                onClick={() => updateActive(removeEscaping(currentTab.content))}
              >
                <ArrowLeftToLine aria-hidden="true" size={14} />
                <span className="hidden @min-[64rem]/editor:inline">{t("editor:unescape")}</span>
              </Button>
              <Button
                variant="ghost"
                size="toolbar"
                aria-label={t("editor:escape")}
                tooltip={t("editor:escapeHint")}
                onClick={() => updateActive(addEscaping(currentTab.content))}
              >
                <ArrowRightFromLine aria-hidden="true" size={14} />
                <span className="hidden @min-[64rem]/editor:inline">{t("editor:escape")}</span>
              </Button>
              <span
                className="h-5 flex-none self-center border-l border-[#cbdbe4] mx-1.5 hidden @min-[64rem]/editor:block"
                aria-hidden="true"
              />
              <Button
                variant="ghost-destructive"
                size="toolbar"
                aria-label={t("common:clear")}
                tooltip={t("editor:clearHint")}
                onClick={() => updateActive("")}
              >
                <Trash2 aria-hidden="true" size={14} />
                <span className="hidden @min-[64rem]/editor:inline">{t("common:clear")}</span>
              </Button>
              <span className="flex-1" />
              <WithTooltip content={translateMessage(currentTab.error)}>
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
                    ? t("editor:invalid")
                    : currentTab.content.trim()
                      ? t("editor:valid")
                      : t("editor:waiting")}
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
                    label={t("editor:tabEditor", { number: tab.id })}
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
            <div className="flex min-h-[26px] flex-none items-center justify-start flex-wrap gap-x-3 gap-y-1 py-[3px] border-t border-border bg-[#fbfdfe] px-3 text-caption text-muted-foreground [&_span:last-child]:tabular-nums">
              <span>
                {t("editor:tabCount", { count: tabs.length })} · {t("editor:characterCount", { count: currentTab.content.length })}
              </span>
              <span>
                {t("editor:cursor", { line: cursor.line, column: cursor.column })}
              </span>
            </div>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
