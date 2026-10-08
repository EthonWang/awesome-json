import { useTranslation } from "react-i18next";
import { copyText } from "@/lib/clipboard";
import { useEffect, useState } from "react";
import JsonView from "@uiw/react-json-view";
import { Check, ChevronDown, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";

function CopyValue({ value, label, showToast }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Button
      tooltip={copied ? t("common:copied") : t("diff:copyNodeHint")}
      variant="unstyled"
      className="json-copy ml-[5px] inline-flex size-5 items-center justify-center rounded border-0 bg-transparent p-0 align-middle text-muted-foreground opacity-0 hover:text-primary focus:opacity-100 group-hover/json-row:opacity-100 group-focus-within/json-row:opacity-100 group-hover/json-node:opacity-100 group-focus-within/json-node:opacity-100"
      aria-label={t(copied ? "diff:copiedNode" : "diff:copyNode", { label })}
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await copyText(JSON.stringify(value, null, 2));
          setCopied(true);
        } catch {
          showToast({ key: "common:copyFailed" }, "error");
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
  const { t } = useTranslation();
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
              aria-label={t(expanded ? "diff:collapseNode" : "diff:expandNode", { label: keyName ?? t("common:root") })}
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
            {t("diff:itemCount", { count: Number(props["data-length"]) })}
            <CopyValue
              value={value}
              label={keyName ?? t("common:root")}
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
