import { useTranslation } from "react-i18next";
import { copyText } from "@/lib/clipboard";
import { scrollBehavior } from "@/lib/scroll";
import { surface, paneHeading, fileEmblem } from "@/lib/workspaceStyles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WithTooltip } from "@/components/ui/tooltip";
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
  describeDiff,
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
  ["all", "diff:all"],
  ["added", "diff:added"],
  ["removed", "diff:removed"],
  ["changed", "diff:changed"],
  ["type", "diff:type"],
];

const kindLabels = {
  added: "diff:added",
  removed: "diff:removed",
  changed: "diff:changed",
  type: "diff:type",
};

export default function JsonDiffResults({
  snapshot,
  onClose,
  showToast,
  active = true,
}) {
  const { t } = useTranslation();
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
            enabled ? t("diff:viewDifference", { message: describeDiff(diffs[line.diffIndex]) }) : undefined
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
    const text = diffs.map((diff) => diff.path + "  " + describeDiff(diff)).join("\n");
    try {
      await copyText(text || t("diff:identical"));
      showToast({ key: "diff:summaryCopied" }, "success");
    } catch {
      showToast({ key: "common:copyFailed" }, "error");
    }
  };

  return (
    <section
      ref={sectionRef}
      className="result-workspace"
      aria-label={t("diff:results")}
    >
      <div
        className={cn(
          "relative block",
          indexOpen &&
            "min-[1440px]:grid min-[1440px]:grid-cols-[minmax(0,1fr)_320px] min-[1440px]:items-stretch min-[1440px]:gap-3",
        )}
      >
        <div className={cn(surface, "w-full")}>
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-3 py-1.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-action text-[#557083] [&_strong]:flex-none [&_strong]:text-body [&_strong]:text-foreground">
              <span className="size-2 flex-none rounded-full bg-[#2da69c] shadow-[0_0_0_4px_#e2f4f0]" />
              <strong>
                {t("diff:completed")}
              </strong>
              <span className="whitespace-nowrap tabular-nums">
                {diffs.length
                  ? t("diff:differenceCount", { count: diffs.length })
                  : t("diff:identical")}
              </span>
              {diffs[selected] && (
                <WithTooltip content={t("diff:currentPath", { path: diffs[selected].path })}>
                  <span
                    tabIndex={0}
                    className="min-w-0 max-w-[min(24rem,100%)] truncate rounded bg-[#e8f0ff] px-2 py-0.5 font-mono text-caption text-[#315db4] focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {t("diff:currentPath", { path: diffs[selected].path })}
                  </span>
                </WithTooltip>
              )}
            </div>
            <div className="ml-auto flex flex-none flex-wrap items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="toolbar"
                tooltip={t("diff:copySummaryHint")}
                onClick={copySummary}
              >
                <Clipboard aria-hidden="true" size={14} />
                {t("diff:copySummary")}
              </Button>
              <Button
                variant="ghost"
                size="toolbar"
                className="border border-[#b6caed] bg-[#edf3ff] text-[#315db4] [&_span]:text-caption"
                tooltip={
                  indexOpen ? t("diff:collapseIndexHint") : t("diff:expandIndexHint")
                }
                aria-expanded={indexOpen}
                aria-controls="diff-index"
                onClick={() => setIndexOpen((open) => !open)}
              >
                <ListFilter aria-hidden="true" size={16} />
                {indexOpen ? t("diff:collapseIndex") : t("diff:expandIndex")}{" "}
                <span>{diffs.length}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 pointer-coarse:size-11"
                tooltip={t("diff:closeResultsHint")}
                aria-label={t("diff:closeResults")}
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
                <strong>
                  {t("diff:left")}
                </strong>
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
                <strong>
                  {t("diff:right")}
                </strong>
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
          className="absolute top-[80px] right-4 z-5 flex h-[min(690px,calc(100%-96px))] w-[clamp(280px,22vw,320px)] flex-col overflow-hidden rounded-[10px] border border-[#c9d9e3] bg-white shadow-[0_15px_42px_#17384b33] min-[1440px]:static min-[1440px]:h-auto min-[1440px]:max-h-[calc(clamp(680px,78vh,900px)+116px)] min-[1440px]:min-h-0 min-[1440px]:w-full min-[1440px]:rounded-[10px] min-[1440px]:shadow-[0_1px_3px_#1e496008] max-[760px]:top-[168px] max-[760px]:right-2 max-[760px]:h-[min(540px,calc(100%-184px))] max-[760px]:w-[min(300px,calc(100%-16px))]"
          aria-label={t("diff:index")}
          hidden={!indexOpen}
        >
          <div className="flex-none px-3 py-2">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <h2 className="m-0 min-w-0 flex-1 whitespace-nowrap text-body font-semibold tracking-[-.03em]">
                {t("diff:index")}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 flex-none pointer-coarse:size-11"
                tooltip={t("diff:collapseIndexHint")}
                aria-label={t("diff:collapsePanel")}
                onClick={() => setIndexOpen(false)}
              >
                <X aria-hidden="true" size={15} />
              </Button>
            </div>
            {diffs.length > 0 && (
              <div
                className="mt-2 flex flex-wrap gap-1 tabular-nums"
                aria-label={t("diff:filter")}
              >
                {filterOptions.map(([type, label]) => (
                  <Button
                    variant="unstyled"
                    key={type}
                    className={cn(
                      "filter min-h-7 rounded-md border border-[#d7e2e8] bg-white px-2 py-0.5 text-action pointer-coarse:min-h-11 font-semibold text-[#627d8e]",
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
                    {t(label)} {counts[type]}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {selected >= 0 && visible.includes(selected) && (
            <div className="flex flex-none items-center gap-1 border-t border-border px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-caption tabular-nums text-muted-foreground" aria-live="polite">
                {t("diff:currentDifference", { current: visible.indexOf(selected) + 1, total: visible.length })}
                <span className="sr-only"> {diffs[selected].path}: {describeDiff(diffs[selected])}</span>
              </span>
              <Button
                variant="navigation"
                size="icon"
                className="size-7 flex-none pointer-coarse:size-11"
                tooltip={t("diff:previousHint")}
                aria-label={t("diff:previous")}
                onClick={() => move(-1)}
                disabled={visible.indexOf(selected) <= 0}
              >
                <ArrowUp aria-hidden="true" size={14} />
              </Button>
              <Button
                variant="navigation"
                size="icon"
                className="size-7 flex-none pointer-coarse:size-11"
                tooltip={t("diff:nextHint")}
                aria-label={t("diff:next")}
                onClick={() => move(1)}
                disabled={visible.indexOf(selected) >= visible.length - 1}
              >
                <ArrowDown aria-hidden="true" size={14} />
              </Button>
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
                        "diff-item grid w-full grid-cols-[4px_minmax(0,1fr)] gap-2.5 border-0 border-b border-[#e5edf1] bg-transparent px-3 py-1.5 text-left hover:bg-[#f0f6fa]",
                        index === selected &&
                          "bg-[#e8f0ff] shadow-[inset_0_0_0_2px_#4a75d3]",
                      )}
                      key={index}
                      aria-current={index === selected ? "true" : undefined}
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
                          {t(kindLabels[diff.kind])}
                        </span>
                        <span className="block font-mono text-action leading-[1.6] text-[#385a70] [overflow-wrap:anywhere]">
                          {diff.path}
                        </span>
                        <span className="block mt-0.5 text-body leading-[1.4] text-muted-foreground [overflow-wrap:anywhere]">
                          {describeDiff(diff)}
                        </span>
                      </span>
                    </Button>
                  ),
              )}
            </div>
          ) : (
            <div className="grid justify-items-center gap-[9px] px-3.5 py-[35px] text-caption text-[#4b9c90]">
              <Check aria-hidden="true" size={24} />
              {t("diff:sameStructure")}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
