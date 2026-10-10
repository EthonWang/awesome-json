import { useTranslation } from "react-i18next";
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
import DiffRulesDialog from "../components/DiffRulesDialog.jsx";
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
  const { t } = useTranslation();
  const label = side === "left" ? t("diff:left") : t("diff:right");
  return (
    <section
      className={cn(
        "source-pane @container/source min-w-0 [&+&]:border-l [&+&]:border-border max-[760px]:[&+&]:border-l-0 max-[760px]:[&+&]:border-t",
        emptyInputs &&
          "min-[761px]:flex min-[761px]:min-h-0 min-[761px]:flex-col",
      )}
      aria-label={label}
    >
      <div
        className={cn(
          paneHeading,
          "grid h-auto min-h-11 flex-none grid-cols-1 gap-x-3 gap-y-1 px-3 py-1.5 @min-[26rem]/source:grid-cols-[minmax(0,1fr)_auto]",
        )}
      >
        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
          <span className={fileEmblem}>{"{ }"}</span>
          <strong className="truncate">{label}</strong>
        </div>
        <div className="flex min-h-0 flex-nowrap items-center gap-0.5 @min-[26rem]/source:justify-end">
          {[
            ["format", t("common:format"), Braces, t("diff:formatHint")],
            ["view", t("diff:view"), Eye, t("diff:viewHint")],
            ["copy", t("common:copy"), Clipboard, t("diff:copyHint")],
            ["edit", t("diff:edit"), Pencil, t("diff:editHint")],
            ["clear", t("common:clear"), Trash2, t("diff:clearHint")],
          ].map(([action, title, Icon, hint]) => (
            <Button
              key={action}
              tooltip={hint}
              variant={action === "clear" ? "ghost-destructive" : "ghost"}
              size="toolbar"
              className="justify-center px-2 pointer-coarse:min-w-11"
              aria-label={title}
              onClick={() => onAction(side, action)}
            >
              <Icon aria-hidden="true" size={14} />
              <span className="hidden @min-[40rem]/source:inline">{title}</span>
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
          placeholder={t("diff:inputPlaceholder", { label })}
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
  const { t } = useTranslation();
  const [sources, setSources] = useState({ left: "", right: "" });
  const [snapshot, setSnapshot] = useState(null);
  const [stale, setStale] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const resultRef = useRef(null);
  const viewerOpenerRef = useRef(null);
  const rulesOpenerRef = useRef(null);
  const expandedInput =
    !snapshot || (!sources.left.trim() && !sources.right.trim());
  const emptyInputs = !sources.left.trim() && !sources.right.trim();

  const setSide = (side, value, user = true) => {
    setSources((current) => ({ ...current, [side]: value }));
    if (snapshot) setStale(true);
    if (user) onDirty();
  };

  const parseSide = (side) => {
    const parsed = parseJsonInput(sources[side], { key: side === "left" ? "diff:left" : "diff:right" });
    if (!parsed.ok) showToast(parsed.translation, parsed.kind);
    return parsed;
  };

  const compare = () => {
    const left = parseSide("left");
    if (!left.ok) return;
    const right = parseSide("right");
    if (!right.ok) return;
    setSnapshot({ left: left.value, right: right.value });
    setStale(false);
    showToast({ key: "diff:updated" }, "success");
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
    showToast({ key: "diff:sampleLoaded" }, "success");
  };

  const clearAll = () => {
    setSources({ left: "", right: "" });
    setSnapshot(null);
    setInputCollapsed(false);
    setStale(false);
    onDirty();
  };

  const onAction = async (side, action) => {
    const label = side === "left" ? t("diff:left") : t("diff:right");
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
        showToast({ key: "diff:copiedSide", values: { label: { key: side === "left" ? "diff:left" : "diff:right" } } }, "success");
      } catch {
        showToast({ key: "common:copyFailed" }, "error");
      }
      return;
    }
    const parsed = parseSide(side);
    if (!parsed.ok) return;
    if (action === "format")
      setSide(side, JSON.stringify(parsed.value, null, 2));
    if (action === "view") {
      viewerOpenerRef.current = document.activeElement;
      setViewer({ side, data: parsed.value });
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
        <div className="flex min-h-10 flex-none items-center justify-between gap-3 border-b border-border bg-[#f9fcfd] px-3 py-1 [&_button]:min-h-7 pointer-coarse:[&_button]:min-h-11 max-[760px]:flex-wrap">
          <div className="flex gap-[9px] max-[760px]:w-full max-[760px]:flex-wrap">
            <Button
              variant="outline"
              size="sm"
              tooltip={t("diff:loadSampleHint")}
              onClick={loadSample}
            >
              <Sparkles aria-hidden="true" size={15} />
              {t("diff:loadSample")}
            </Button>
            {snapshot && (
              <Button
                variant="outline"
                size="sm"
                tooltip={
                  inputCollapsed
                    ? t("diff:expandInputHint")
                    : t("diff:collapseInputHint")
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
                {inputCollapsed ? t("diff:expandInput") : t("diff:collapseInput")}
              </Button>
            )}
          </div>
          <div className="flex gap-[9px] max-[760px]:w-full max-[760px]:flex-wrap">
            <Button
              ref={rulesOpenerRef}
              variant="ghost"
              size="sm"
              tooltip={t("diff:rulesHint")}
              aria-haspopup="dialog"
              onClick={() => setRulesOpen(true)}
            >
              {t("diff:viewRules")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              tooltip={t("diff:clearBothHint")}
              onClick={clearAll}
            >
              <Trash2 aria-hidden="true" size={15} />
              {t("diff:clearBoth")}
            </Button>
            <Button
              variant="default"
              size="sm"
              tooltip={t("diff:compareHint")}
              onClick={compare}
            >
              <GitCompare aria-hidden="true" size={16} />
              {snapshot ? t("diff:compareAgain") : t("diff:compare")}
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
          <span>
            {t("diff:stale")}
          </span>
          <Button
            variant="unstyled"
            className="whitespace-nowrap border-0 bg-transparent font-semibold text-[#925c20] hover:underline"
            tooltip={t("diff:compareHint")}
            onClick={compare}
          >
            {t("diff:compareAgain")}
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
              {t("diff:empty")}
            </h2>
            <Button
              variant="default"
              size="sm"
              tooltip={t("diff:compareHint")}
              onClick={compare}
            >
              {t("diff:compare")}
            </Button>
          </div>
        ) : null}
      </div>

      <DiffRulesDialog
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        openerRef={rulesOpenerRef}
      />
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
              {t("diff:viewerTitle", { label: t(viewer?.side === "left" ? "diff:left" : "diff:right") })}
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                tooltip={t("diff:closeViewHint")}
                aria-label={t("diff:closeView")}
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
