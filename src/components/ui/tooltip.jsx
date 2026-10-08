import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function TooltipProvider({
  delayDuration = 600,
  skipDelayDuration = 300,
  ...props
}) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
function TooltipContent({ className, sideOffset = 6, children, ...props }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "z-[120] max-w-[min(320px,calc(100vw-16px))] rounded-md bg-[var(--navy)] px-2.5 py-1.5 text-action leading-relaxed text-white shadow-md",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-[var(--navy)]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
function WithTooltip({ content, children }) {
  if (!content) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}
export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  WithTooltip,
};
