import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import { WithTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        default:
          "inline-flex items-center justify-center gap-[7px] whitespace-nowrap rounded-[9px] border border-primary bg-primary font-semibold text-primary-foreground shadow-[0_3px_0_#2a52b2] hover:bg-[#315bbe]",
        outline:
          "inline-flex items-center justify-center gap-[7px] whitespace-nowrap rounded-[9px] border border-border bg-background font-semibold text-[#486276] hover:border-[#acc5d3] hover:bg-[#f8fbfd]",
        destructive:
          "inline-flex items-center justify-center gap-[7px] whitespace-nowrap rounded-[9px] border border-[#e5c5ca] bg-background font-semibold text-destructive hover:border-[#d8a6ae] hover:bg-[#fff0f1]",
        ghost:
          "inline-flex items-center gap-[5px] whitespace-nowrap rounded-md border-0 bg-transparent font-semibold text-[#526c7d] hover:bg-accent hover:text-primary",
        "ghost-destructive":
          "inline-flex items-center gap-[5px] whitespace-nowrap rounded-md border-0 bg-transparent font-semibold text-destructive hover:bg-[#fff0f1] hover:text-[#a13f4d]",
        navigation:
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-[#bdd0ea] bg-[#edf3ff] font-semibold text-[#315db4] hover:bg-[#dce8ff]",
        unstyled: "",
      },
      size: {
        default: "min-h-[38px] px-3.5 text-action [&_svg]:size-[15px]",
        sm: "min-h-8 px-2.5 text-action [&_svg]:size-[15px]",
        compact: "min-h-[34px] px-2.5 text-action [&_svg]:size-[15px]",
        toolbar: "min-h-7 pointer-coarse:min-h-11 px-2 text-action [&_svg]:size-3.5",
        icon: "grid size-8 place-items-center p-0 [&_svg]:size-[18px]",
        unstyled: "",
      },
    },
    defaultVariants: { variant: "outline", size: "default" },
  },
);

function Button({
  className,
  tooltip,
  title,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <WithTooltip content={tooltip ?? title}>
      <Comp
        data-slot="button"
        type={asChild ? undefined : type}
        className={cn(
          buttonVariants({
            variant,
            size: size ?? (variant === "unstyled" ? "unstyled" : undefined),
          }),
          className,
        )}
        {...props}
      />
    </WithTooltip>
  );
}

export { Button, buttonVariants };
