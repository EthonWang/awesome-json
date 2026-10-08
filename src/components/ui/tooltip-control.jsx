import { createRoot } from "react-dom/client";
import { TooltipProvider, WithTooltip } from "./tooltip";

// CodeMirror owns the panel DOM. Mount its controls through the same Tooltip
// components and defaults as the React pages, and dispose them with the panel.
export function createTooltipControl(initialProps) {
  const dom = document.createElement("span");
  dom.className = "contents";
  const root = createRoot(dom);
  let props = initialProps;
  function update(next = {}) {
    props = { ...props, ...next };
    const {
      label,
      hint = label,
      onClick,
      className,
      Icon,
      text,
      pressed,
      expanded,
    } = props;
    root.render(
      <TooltipProvider>
        <WithTooltip content={hint}>
          <button
            type="button"
            className={className}
            aria-label={label}
            aria-pressed={pressed}
            aria-expanded={expanded}
            onClick={onClick}
          >
            {Icon ? <Icon aria-hidden="true" size={14} /> : text}
          </button>
        </WithTooltip>
      </TooltipProvider>,
    );
  }
  update();
  return { dom, update, destroy: () => queueMicrotask(() => root.unmount()) };
}
