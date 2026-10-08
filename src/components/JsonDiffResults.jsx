import { copyText } from "@/lib/clipboard";
import { scrollBehavior } from "@/lib/scroll";
import { surface, paneHeading, fileEmblem } from "@/lib/workspaceStyles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clipboard,
  ListFilter,
  X,
} from "lucide-react";
import {
  DiffType,
  diffJson,
  formatJsonWithPaths,
  markDiffLines,
} from "../utils/jsonDiff.js";

const TOKEN =
  /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|(\btrue\b|\bfalse\b|\bnull\b)|(-?\b\d+(?:\.\d+)?\b)/g;

function colorize(text) {
  const parts = [];
  let cursor = 0;
  let match;
  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    const kind = match[1]
      ? "key"
      : match[2]
        ? "string"
        : match[3]
          ? "bool"
          : "number";
    parts.push(
      <span className={"tok-" + kind} key={match.index}>
        {match[0]}
      </span>,
    );
    cursor = TOKEN.lastIndex;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function buildComparison(left, right) {
  const diffs = diffJson(left, right).map((diff) => ({
    ...diff,
    kind:
      diff.type === DiffType.MISSING
        ? diff.leftVal === undefined
          ? "added"
          : "removed"
        : diff.type === DiffType.TYPE
          ? "type"
          : "changed",
  }));
  return {
    diffs,
    leftLines: markDiffLines(formatJsonWithPaths(left, true), diffs, "left"),
    rightLines: markDiffLines(formatJsonWithPaths(right, true), diffs, "right"),
  };
}

const filterOptions = [
  ["all", "全部"],
  ["added", "新增"],
  ["removed", "缺失"],
  ["changed", "修改"],
  ["type", "类型"],
];

const kindLabels = {
  added: "新增",
  removed: "缺失",
  changed: "修改",
  type: "类型",
};

export default function JsonDiffResults({
  snapshot,
  onClose,
  showToast,
  active = true,
}) {
  const { diffs, leftLines, rightLines } = useMemo(
    () => buildComparison(snapshot.left, snapshot.right),
    [snapshot],
  );
  const [filter, setFilter] = useState("all");
  const [indexOpen, setIndexOpen] = useState(true);
  const [selected, setSelected] = useState(diffs.length ? 0 : -1);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const listRef = useRef(null);
  const sectionRef = useRef(null);
  const visible = useMemo(
    () =>
      diffs
        .map((_, index) => index)
        .filter((index) => filter === "all" || diffs[index].kind === filter),
    [diffs, filter],
  );
  const counts = useMemo(
    () => ({
      all: diffs.length,
      added: diffs.filter((diff) => diff.kind === "added").length,
      removed: diffs.filter((diff) => diff.kind === "removed").length,
      changed: diffs.filter((diff) => diff.kind === "changed").length,
      type: diffs.filter((diff) => diff.kind === "type").length,
    }),
    [diffs],
  );

  useEffect(() => {
    setFilter("all");
    setSelected(diffs.length ? 0 : -1);
    setIndexOpen(true);
  }, [snapshot, diffs.length]);

  useEffect(() => {
    if (!visible.includes(selected)) setSelected(visible[0] ?? -1);
  }, [visible, selected]);

  const scrollToIndex = (index) => {
    const movePane = (ref) => {
      const pane = ref.current;
      const row = pane?.querySelector('[data-diff-index="' + index + '"]');
      if (!pane || !row) return;
      const target =
        pane.scrollTop +
        row.getBoundingClientRect().top -
        pane.getBoundingClientRect().top -
        pane.clientHeight / 2 +
        row.clientHeight / 2;
      pane.scrollTo({ top: Math.max(0, target), behavior: scrollBehavior() });
    };
    requestAnimationFrame(() => {
      movePane(leftRef);
      movePane(rightRef);
      movePane(listRef);
      sectionRef.current?.scrollIntoView({
        block: "nearest",
        behavior: scrollBehavior(),
      });
    });
  };

  const select = (index) => {
    if (!visible.includes(index)) return;
    setSelected(index);
    scrollToIndex(index);
  };

  const move = (direction) => {
    const current = visible.indexOf(selected);
    const next = visible[current + direction];
    if (next !== undefined) select(next);
  };

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event) => {
      if (
        event.target.closest(
          'textarea, input, button, [contenteditable="true"], [role="dialog"]',
        )
      )
        return;
      if (
        event.key === "n" ||
        event.key === "N" ||
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        move(1);
      } else if (
        event.key === "p" ||
        event.key === "P" ||
        event.key === "ArrowLeft"
      ) {
        event.preventDefault();
        move(-1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  const renderLines = (lines) =>
    lines.map((line, index) => {
      const hasDiff = line.diffIndex !== null && line.diffIndex !== undefined;
      const enabled = hasDiff && visible.includes(line.diffIndex);
      const selectedLine = enabled && line.diffIndex === selected;
      const className = [
        "diff-code-line grid min-h-[var(--code-line-height)] grid-cols-[48px_max-content] items-center whitespace-pre border-l-[3px] border-transparent font-mono text-code",
        hasDiff ? "diff-" + diffs[line.diffIndex].kind : "",
        hasDiff && !enabled ? "muted" : "",
        selectedLine ? "selected" : "",
        selectedLine && lines[index - 1]?.diffIndex !== selected
          ? "selected-start"
          : "",
        selectedLine && lines[index + 1]?.diffIndex !== selected
          ? "selected-end"
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      return (
        <div
          key={index}
          className={className}
          data-diff-index={hasDiff ? line.diffIndex : undefined}
          role={enabled ? "button" : undefined}
          tabIndex={enabled ? 0 : undefined}
          aria-label={
            enabled ? "查看差异：" + diffs[line.diffIndex].msg : undefined
          }
          onClick={enabled ? () => select(line.diffIndex) : undefined}
          onKeyDown={
            enabled
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select(line.diffIndex);
                  }
                }
              : undefined
          }
        >
          <span className="select-none pr-[13px] text-right font-mono text-caption leading-none text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="pl-[13px] pr-[18px]">
            {"  ".repeat(line.depth)}
            {colorize(line.text)}
          </span>
        </div>
      );
    });

  const copySummary = async () => {
    const text = diffs.map((diff) => diff.path + "　" + diff.msg).join("\n");
    try {
      await copyText(text || "两侧 JSON 语义完全相同");
      showToast("已复制差异摘要。", "success");
    } catch {
      showToast("自动复制失败，请选中内容后按 Ctrl/Cmd+C 复制。", "error");
    }
  };

  return (
    <section
      ref={sectionRef}
      className="result-workspace"
      aria-label="JSON 差异结果"
    >
      <div
        className={cn(
          "relative block",
          indexOpen &&
            "min-[1440px]:grid min-[1440px]:grid-cols-[minmax(0,1fr)_320px] min-[1440px]:items-stretch min-[1440px]:gap-3",
        )}
      >
        <div className={cn(surface, "w-full")}>
          <div className="flex min-h-[56px] py-2 items-center justify-between gap-2.5 border-b border-border pl-5 pr-[18px] max-[760px]:h-auto max-[760px]:min-h-[100px] max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:gap-1.5 max-[760px]:px-2.5 max-[760px]:py-2">
            <div className="flex items-center gap-[9px] min-w-0 flex-wrap text-action text-[#557083] [&_strong]:flex-none [&_strong]:text-body [&_strong]:text-foreground">
              <span className="size-2 flex-none rounded-full bg-[#2da69c] shadow-[0_0_0_4px_#e2f4f0]" />
              <strong>对比完成</strong>
              <span className="whitespace-nowrap tabular-nums">
                {diffs.length
                  ? "发现 " + diffs.length + " 处差异"
                  : "两侧 JSON 语义完全相同"}
              </span>
              {diffs[selected] && (
                <span className="min-w-0 max-w-[min(32vw,100%)] truncate rounded-[5px] bg-[#e8f0ff] px-2 py-1 font-mono text-caption text-[#315db4]">
                  当前：{diffs[selected].path}
                </span>
              )}
            </div>
            <div className="flex flex-none items-center gap-2 max-[760px]:flex-wrap max-[760px]:justify-end max-[760px]:gap-1">
              <Button
                variant="ghost"
                size="sm"
                tooltip="复制差异路径和变更说明"
                onClick={copySummary}
              >
                <Clipboard aria-hidden="true" size={14} />
                复制摘要
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="border border-[#b6caed] bg-[#edf3ff] text-[#315db4] [&_span]:text-caption"
                tooltip={
                  indexOpen ? "收起差异索引面板" : "展开索引，快速定位差异"
                }
                aria-expanded={indexOpen}
                aria-controls="diff-index"
                onClick={() => setIndexOpen((open) => !open)}
              >
                <ListFilter aria-hidden="true" size={16} />
                {indexOpen ? "收起索引" : "展开索引"}{" "}
                <span>{diffs.length}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                tooltip="关闭对比结果，保留输入内容"
                aria-label="关闭对比结果"
                onClick={onClose}
              >
                <X aria-hidden="true" size={15} />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 max-[760px]:block">
            <div className="diff-pane min-w-0 [&+&]:border-l [&+&]:border-border max-[760px]:[&+&]:border-l-0 max-[760px]:[&+&]:border-t">
              <div className={paneHeading}>
                <span className={fileEmblem}>{"{ }"}</span>
                <strong>原始 JSON</strong>
              </div>
              <div
                className="diff-code-scroll h-[clamp(680px,78vh,900px)] max-[760px]:h-[clamp(320px,50dvh,480px)] overflow-auto overscroll-contain pt-2.5 pb-3.5 [background:linear-gradient(90deg,#f6f9fb_0_48px,#fff_48px)] [scrollbar-width:thin] [scrollbar-color:#cbdbe4_transparent]"
                ref={leftRef}
              >
                {renderLines(leftLines)}
              </div>
            </div>
            <div className="diff-pane min-w-0 [&+&]:border-l [&+&]:border-border max-[760px]:[&+&]:border-l-0 max-[760px]:[&+&]:border-t">
              <div className={paneHeading}>
                <span className={fileEmblem}>{"{ }"}</span>
                <strong>目标 JSON</strong>
              </div>
              <div
                className="diff-code-scroll h-[clamp(680px,78vh,900px)] max-[760px]:h-[clamp(320px,50dvh,480px)] overflow-auto overscroll-contain pt-2.5 pb-3.5 [background:linear-gradient(90deg,#f6f9fb_0_48px,#fff_48px)] [scrollbar-width:thin] [scrollbar-color:#cbdbe4_transparent]"
                ref={rightRef}
              >
                {renderLines(rightLines)}
              </div>
            </div>
          </div>
        </div>
        <aside
          id="diff-index"
          className="absolute top-[80px] right-4 z-5 flex h-[min(690px,calc(100%-96px))] w-[clamp(310px,20vw,360px)] flex-col overflow-hidden rounded-[10px] border border-[#c9d9e3] bg-white shadow-[0_15px_42px_#17384b33] min-[1440px]:static min-[1440px]:h-auto min-[1440px]:max-h-[calc(clamp(680px,78vh,900px)+116px)] min-[1440px]:min-h-0 min-[1440px]:w-full min-[1440px]:rounded-[10px] min-[1440px]:shadow-[0_1px_3px_#1e496008] max-[760px]:top-[168px] max-[760px]:right-2 max-[760px]:h-[min(540px,calc(100%-184px))] max-[760px]:w-[min(310px,calc(100%-16px))]"
          aria-label="差异索引"
          hidden={!indexOpen}
        >
          <div className="flex-none px-3.5 pt-[13px] pb-3">
            <div className="flex items-center justify-between gap-2.5">
              <h2 className="m-0 text-title font-semibold tracking-[-.03em]">
                差异索引
              </h2>
              <Button
                variant="ghost"
                size="sm"
                tooltip="收起差异索引面板"
                onClick={() => setIndexOpen(false)}
              >
                收起面板 <X aria-hidden="true" size={15} />
              </Button>
            </div>
            {diffs.length > 0 && (
              <div
                className="flex flex-wrap gap-[5px] mt-2.5 tabular-nums"
                aria-label="筛选差异"
              >
                {filterOptions.map(([type, label]) => (
                  <Button
                    variant="unstyled"
                    key={type}
                    className={cn(
                      "filter rounded-[7px] border border-[#d7e2e8] bg-white px-[9px] py-[7px] text-action font-semibold text-[#627d8e]",
                      "diff-" + type,
                      filter === type
                        ? "active border-[var(--navy)] bg-[var(--navy)] text-white"
                        : "hover:bg-[#f1f6f9]",
                    )}
                    aria-pressed={filter === type}
                    onClick={() => {
                      setFilter(type);
                      listRef.current?.scrollTo({ top: 0 });
                    }}
                  >
                    {label} {counts[type]}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {selected >= 0 && visible.includes(selected) && (
            <div
              className="relative flex-none mx-[15px] my-3.5 rounded-[9px] border border-[#dce7ec] bg-white p-3 [&_small]:text-caption [&_small]:text-muted-foreground [&_p]:m-0 [&_p]:text-body [&_p]:leading-[1.55] [&_p]:text-[#607987] [&_strong]:block [&_strong]:my-[5px] [&_strong]:font-mono [&_strong]:text-action [&_strong]:text-[#315269] [&_strong]:[overflow-wrap:anywhere]"
              aria-live="polite"
            >
              <small className="mb-2 block tabular-nums">
                当前差异　{visible.indexOf(selected) + 1} / {visible.length}
              </small>
              <div className="mb-3 flex gap-[7px]">
                <Button
                  variant="navigation"
                  size="compact"
                  className="flex-1"
                  tooltip="定位上一处差异"
                  onClick={() => move(-1)}
                  disabled={visible.indexOf(selected) <= 0}
                >
                  <ArrowUp aria-hidden="true" size={15} />
                  上一个
                </Button>
                <Button
                  variant="navigation"
                  size="compact"
                  className="flex-1"
                  tooltip="定位下一处差异"
                  onClick={() => move(1)}
                  disabled={visible.indexOf(selected) >= visible.length - 1}
                >
                  下一个
                  <ArrowDown aria-hidden="true" size={15} />
                </Button>
              </div>
              <strong>{diffs[selected].path}</strong>
              <p>{diffs[selected].msg}</p>
            </div>
          )}
          {diffs.length > 0 ? (
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border"
              ref={listRef}
            >
              {diffs.map(
                (diff, index) =>
                  visible.includes(index) && (
                    <Button
                      variant="unstyled"
                      data-diff-index={index}
                      className={cn(
                        "diff-item grid w-full grid-cols-[4px_minmax(0,1fr)] gap-2.5 border-0 border-b border-[#e5edf1] bg-transparent px-3 py-2.5 text-left hover:bg-[#f0f6fa]",
                        index === selected &&
                          "bg-[#e8f0ff] shadow-[inset_0_0_0_2px_#4a75d3]",
                      )}
                      key={index}
                      onClick={() => select(index)}
                    >
                      <span className={"bar rounded-[5px] diff-" + diff.kind} />
                      <span className="min-w-0">
                        <span
                          className={
                            "diff-kind float-right ml-1.5 rounded px-[5px] py-0.5 text-caption font-semibold leading-[1.3] diff-" +
                            diff.kind
                          }
                        >
                          {kindLabels[diff.kind]}
                        </span>
                        <span className="block font-mono text-action leading-[1.6] text-[#385a70] [overflow-wrap:anywhere]">
                          {diff.path}
                        </span>
                        <span className="block mt-0.5 text-body leading-[1.4] text-muted-foreground [overflow-wrap:anywhere]">
                          {diff.msg}
                        </span>
                      </span>
                    </Button>
                  ),
              )}
            </div>
          ) : (
            <div className="grid justify-items-center gap-[9px] px-3.5 py-[35px] text-caption text-[#4b9c90]">
              <Check aria-hidden="true" size={24} />
              结构与值都相同。
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
