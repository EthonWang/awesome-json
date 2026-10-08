import { copyText } from "@/lib/clipboard";
import { scrollBehavior } from "@/lib/scroll";
import { surface, paneHeading, fileEmblem } from "@/lib/workspaceStyles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import JsonTree from "../components/JsonTree.jsx";
import {
  Braces,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Eye,
  FileJson,
  GitCompare,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import CodeEditor from "../components/CodeEditor.jsx";
import JsonDiffResults from "../components/JsonDiffResults.jsx";
import { parseJsonInput } from "../utils/jsonActions.js";
import {
  sampleLeft,
  sampleLeftText,
  sampleRight,
  sampleRightText,
} from "../utils/sampleData.js";

function SourcePane({
  side,
  value,
  onChange,
  active,
  onAction,
  emptyInputs,
  expandedInput,
}) {
  const label = side === "left" ? "原始 JSON" : "目标 JSON";
  return (
    <section
      className={cn(
        "source-pane min-w-0 [&+&]:border-l [&+&]:border-border max-[760px]:[&+&]:border-l-0 max-[760px]:[&+&]:border-t",
        emptyInputs &&
          "min-[761px]:flex min-[761px]:min-h-0 min-[761px]:flex-col",
      )}
      aria-label={label}
    >
      <div
        className={cn(
          paneHeading,
          "h-auto min-h-[52px] flex-none flex-wrap gap-x-3 gap-y-1 px-3 py-2",
        )}
      >
        <div className="flex flex-none items-center gap-2 whitespace-nowrap">
          <span className={fileEmblem}>{"{ }"}</span>
          <strong>{label}</strong>
        </div>
        <div className="flex min-h-0 flex-wrap items-center gap-0.5 p-0 ml-auto max-[420px]:gap-0">
          {[
            ["format", "格式化", Braces, "按缩进整理这一侧的 JSON"],
            ["view", "可视化", Eye, "以可展开的树形结构查看 JSON"],
            ["copy", "复制", Clipboard, "复制这一侧的全部内容"],
            ["edit", "编辑", Pencil, "在编辑页面的新标签页中打开内容"],
            ["clear", "清空", Trash2, "清空这一侧的内容"],
          ].map(([action, title, Icon, hint]) => (
            <Button
              key={action}
              tooltip={hint}
              variant={action === "clear" ? "ghost-destructive" : "ghost"}
              size="sm"
              className="px-1.5"
              onClick={() => onAction(side, action)}
            >
              <Icon aria-hidden="true" size={14} />
              {title}
            </Button>
          ))}
        </div>
      </div>
      <div
        className={cn(
          "source-editor overflow-hidden",
          expandedInput
            ? "h-[clamp(440px,58vh,680px)] max-[760px]:h-[clamp(280px,42vh,380px)]"
            : "h-[250px] max-[760px]:h-[220px]",
          emptyInputs &&
            "min-[761px]:h-auto min-[761px]:min-h-0 min-[761px]:flex-1",
        )}
      >
        <CodeEditor
          label={label}
          value={value}
          onChange={(text) => onChange(side, text)}
          active={active}
          placeholder={"在此处输入" + label}
        />
      </div>
    </section>
  );
}

export default function DiffPage({
  showToast,
  onDirty,
  onOpenEditor,
  active = true,
}) {
  const [sources, setSources] = useState({ left: "", right: "" });
  const [snapshot, setSnapshot] = useState(null);
  const [stale, setStale] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const resultRef = useRef(null);
  const viewerOpenerRef = useRef(null);
  const expandedInput =
    !snapshot || (!sources.left.trim() && !sources.right.trim());
  const emptyInputs = !sources.left.trim() && !sources.right.trim();

  const setSide = (side, value, user = true) => {
    setSources((current) => ({ ...current, [side]: value }));
    if (snapshot) setStale(true);
    if (user) onDirty();
  };

  const parseSide = (side) => {
    const label = side === "left" ? "原始 JSON" : "目标 JSON";
    const parsed = parseJsonInput(sources[side], label);
    if (!parsed.ok) showToast(parsed.message, parsed.kind);
    return parsed;
  };

  const compare = () => {
    const left = parseSide("left");
    if (!left.ok) return;
    const right = parseSide("right");
    if (!right.ok) return;
    setSnapshot({ left: left.value, right: right.value });
    setStale(false);
    showToast("对比已更新。", "success");
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({
        behavior: scrollBehavior(),
        block: "start",
      }),
    );
  };

  const loadSample = () => {
    setSources({ left: sampleLeftText, right: sampleRightText });
    setSnapshot({ left: sampleLeft, right: sampleRight });
    setStale(false);
    showToast("已载入示例数据。", "success");
  };

  const clearAll = () => {
    setSources({ left: "", right: "" });
    setSnapshot(null);
    setInputCollapsed(false);
    setStale(false);
    onDirty();
  };

  const onAction = async (side, action) => {
    const label = side === "left" ? "原始 JSON" : "目标 JSON";
    const text = sources[side];
    if (action === "clear") {
      setSide(side, "");
      return;
    }
    if (action === "edit") {
      onOpenEditor(text);
      return;
    }
    if (action === "copy") {
      try {
        await copyText(text);
        showToast("已复制" + label + "。", "success");
      } catch {
        showToast("自动复制失败，请选中内容后按 Ctrl/Cmd+C 复制。", "error");
      }
      return;
    }
    const parsed = parseSide(side);
    if (!parsed.ok) return;
    if (action === "format")
      setSide(side, JSON.stringify(parsed.value, null, 2));
    if (action === "view") {
      viewerOpenerRef.current = document.activeElement;
      setViewer({ label, data: parsed.value });
    }
  };

  return (
    <>
      <h1 className="sr-only">JSON Diff</h1>
      <div
        className={cn(
          surface,
          "mb-3 border-[#cfdee7]",
          emptyInputs &&
            "min-[761px]:flex min-[761px]:h-[max(420px,calc(100dvh-var(--app-header-height)-30px))] min-[761px]:flex-col",
        )}
      >
        <div className="flex min-h-11 flex-none items-center justify-between gap-3 border-b border-border bg-[#f9fcfd] px-3 py-[5px] max-[760px]:flex-wrap">
          <div className="flex gap-[9px] max-[760px]:w-full max-[760px]:flex-wrap">
            <Button
              variant="outline"
              size="sm"
              tooltip="载入一组示例 JSON 并查看对比结果"
              onClick={loadSample}
            >
              <Sparkles aria-hidden="true" size={15} />
              载入示例
            </Button>
            {snapshot && (
              <Button
                variant="outline"
                size="sm"
                tooltip={
                  inputCollapsed
                    ? "展开输入以修改 JSON"
                    : "收起输入，为对比结果腾出空间"
                }
                aria-expanded={!inputCollapsed}
                aria-controls="diff-source-inputs"
                onClick={() => setInputCollapsed((collapsed) => !collapsed)}
              >
                {inputCollapsed ? (
                  <ChevronDown aria-hidden="true" size={15} />
                ) : (
                  <ChevronUp aria-hidden="true" size={15} />
                )}
                {inputCollapsed ? "展开输入" : "收起输入"}
              </Button>
            )}
          </div>
          <div className="flex gap-[9px] max-[760px]:w-full max-[760px]:flex-wrap">
            <Button
              variant="destructive"
              size="sm"
              tooltip="清空两侧输入和对比结果"
              onClick={clearAll}
            >
              <Trash2 aria-hidden="true" size={15} />
              清空两侧
            </Button>
            <Button
              variant="default"
              size="sm"
              tooltip="对比两侧 JSON 的内容差异"
              onClick={compare}
            >
              <GitCompare aria-hidden="true" size={16} />
              {snapshot ? "重新对比" : "开始对比"}
            </Button>
          </div>
        </div>
        <div
          className={cn(
            "grid grid-cols-2 max-[760px]:block",
            emptyInputs && "min-[761px]:min-h-0 min-[761px]:flex-1",
          )}
          id="diff-source-inputs"
          hidden={Boolean(snapshot) && inputCollapsed}
        >
          <SourcePane
            side="left"
            value={sources.left}
            onChange={setSide}
            onAction={onAction}
            active={active}
            emptyInputs={emptyInputs}
            expandedInput={expandedInput}
          />
          <SourcePane
            side="right"
            value={sources.right}
            onChange={setSide}
            onAction={onAction}
            active={active}
            emptyInputs={emptyInputs}
            expandedInput={expandedInput}
          />
        </div>
      </div>

      {snapshot && stale && (
        <div
          className="flex items-center justify-between gap-[15px] mb-[15px] rounded-[9px] border border-[#edd9af] bg-[#fff8e9] px-3.5 py-[11px] text-action text-[#946a33]"
          role="status"
        >
          <span>输入内容已变化，下面显示的是上一次对比结果。</span>
          <Button
            variant="unstyled"
            className="whitespace-nowrap border-0 bg-transparent font-semibold text-[#925c20] hover:underline"
            tooltip="对比两侧 JSON 的内容差异"
            onClick={compare}
          >
            重新对比
          </Button>
        </div>
      )}
      <div ref={resultRef}>
        {snapshot ? (
          <JsonDiffResults
            snapshot={snapshot}
            active={active}
            showToast={showToast}
            onClose={() => {
              setSnapshot(null);
              setStale(false);
              setInputCollapsed(false);
            }}
          />
        ) : sources.left.trim() || sources.right.trim() ? (
          <div className="flex min-h-[335px] flex-col items-center justify-center gap-[11px] rounded-xl border border-dashed border-[#bfd2de] bg-[#f9fcfe] text-center text-[#7993a2]">
            <FileJson aria-hidden="true" size={34} strokeWidth={1.4} />
            <h2 className="m-0 font-semibold text-pretty text-title text-[#35586f]">
              暂无对比结果
            </h2>
            <Button
              variant="default"
              size="sm"
              tooltip="对比两侧 JSON 的内容差异"
              onClick={compare}
            >
              开始对比
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog
        open={Boolean(viewer)}
        onOpenChange={(open) => {
          if (!open) setViewer(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            viewerOpenerRef.current?.focus();
          }}
          overlayClassName="z-80 bg-[#0f26357d]"
          className="z-81 flex h-[min(740px,calc(100vh-30px))] w-[min(860px,calc(100vw-30px))] max-w-none flex-col gap-0 overflow-hidden rounded-xl bg-white p-0 shadow-[0_16px_48px_#0823322e] sm:max-w-none"
          aria-describedby={undefined}
        >
          <div className="flex min-h-[58px] flex-none items-center justify-between border-b border-border pl-[22px] pr-[17px]">
            <DialogTitle className="m-0 flex items-center gap-[9px] text-title">
              <FileJson aria-hidden="true" size={19} />
              {viewer?.label} · 可视化
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                tooltip="关闭可视化，返回输入区"
                aria-label="关闭可视化"
              >
                <X aria-hidden="true" size={18} />
              </Button>
            </DialogClose>
          </div>
          <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain px-[22px] pt-0.5 pb-[22px] font-mono text-body">
            {viewer &&
            viewer.data !== null &&
            typeof viewer.data === "object" ? (
              <JsonTree value={viewer.data} showToast={showToast} />
            ) : (
              <pre className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                {JSON.stringify(viewer?.data, null, 2)}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
