import { useTranslation } from "react-i18next";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function Dialog(props) {
  return <DialogPrimitive.Root {...props} />;
}
function DialogClose(props) {
  return <DialogPrimitive.Close {...props} />;
}
function DialogContent({
  className,
  children,
  overlayClassName,
  showCloseButton = true,
  ...props
}) {
  const { t } = useTranslation();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className={cn("fixed inset-0 z-50 bg-black/50", overlayClassName)}
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 shadow-lg outline-none",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              aria-label={t("common:closeDialog")}
            >
              <X />
            </Button>
          </DialogClose>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-title font-semibold", className)}
      {...props}
    />
  );
}

export { Dialog, DialogClose, DialogContent, DialogTitle };
