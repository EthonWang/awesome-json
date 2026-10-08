import { copyText } from "@/lib/clipboard";
import { useEffect, useState } from "react";
import JsonView from "@uiw/react-json-view";
import { Check, ChevronDown, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";

function CopyValue({ value, label, showToast }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Button
      tooltip={copied ? "已复制" : "复制此节点及其内容"}
      variant="unstyled"
      className="json-copy ml-[5px] inline-flex size-5 items-center justify-center rounded border-0 bg-transparent p-0 align-middle text-muted-foreground opacity-0 hover:text-primary focus:opacity-100 group-hover/json-row:opacity-100 group-focus-within/json-row:opacity-100 group-hover/json-node:opacity-100 group-focus-within/json-node:opacity-100"
      aria-label={copied ? `已复制 ${label}` : `复制 ${label}`}
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await copyText(JSON.stringify(value, null, 2));
          setCopied(true);
        } catch {
          showToast("自动复制失败，请选中内容后按 Ctrl/Cmd+C 复制。", "error");
        }
      }}
    >
      {copied ? (
        <Check aria-hidden="true" size={14} />
      ) : (
        <Clipboard aria-hidden="true" size={14} />
      )}
    </Button>
  );
}

export default function JsonTree({ value, showToast }) {
  return (
    <JsonView
      className="json-viewer min-w-max px-2.5 py-3"
      value={value}
      style={{
        fontSize: "var(--type-body)",
        lineHeight: "var(--tree-line-height)",
        "--w-rjv-line-style": "dashed",
      }}
      indentWidth={20}
      collapsed={5}
      displayDataTypes={false}
      shortenTextAfterLength={0}
      highlightUpdates={false}
      enableClipboard={false}
      translate="no"
    >
      <JsonView.Arrow
        render={({ style, ...props }, { keyName }) => {
          // The library's transform reflects the initial collapsed depth as well as toggles.
          const expanded = style.transform === "rotate(0deg)";
          return (
            <button
              {...props}
              type="button"
              className="inline-flex shrink-0 items-center cursor-pointer rounded border-0 bg-transparent p-0 text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
              style={{ ...style, transition: "transform .15s" }}
              aria-label={`${expanded ? "收起" : "展开"} ${keyName ?? "根节点"}`}
              aria-expanded={expanded}
            >
              <ChevronDown aria-hidden="true" size={16} />
            </button>
          );
        }}
      />
      <JsonView.CountInfo
        style={{ fontStyle: "normal", fontSize: "var(--type-action)" }}
        render={(props, { value, keyName }) => (
          <span {...props} className="group/json-node">
            {props["data-length"]} 项
            <CopyValue
              value={value}
              label={keyName ?? "根节点"}
              showToast={showToast}
            />
          </span>
        )}
      />
      <JsonView.Row
        render={(props, { value, keyName }) => (
          <div {...props} className={`${props.className ?? ""} group/json-row`}>
            {props.children}
            <CopyValue value={value} label={keyName} showToast={showToast} />
          </div>
        )}
      />
    </JsonView>
  );
}
