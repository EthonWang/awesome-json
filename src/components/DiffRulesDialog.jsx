import { useTranslation } from "react-i18next";
import { BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

const sections = [
  ["comparison", ["structure", "numbers", "types", "arrays", "strings", "missing", "counting", "syntax"]],
  ["limitations", ["precision", "duplicates", "paths", "display", "size"]],
];

export default function DiffRulesDialog({ open, onOpenChange, openerRef }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby="diff-rules-description"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          openerRef.current?.focus();
        }}
        overlayClassName="z-80 bg-[#0f26357d]"
        className="z-81 flex max-h-[calc(100dvh-30px)] w-[min(720px,calc(100vw-30px))] max-w-none flex-col gap-0 overflow-hidden rounded-xl bg-white p-0 sm:max-w-none"
      >
        <div className="flex min-h-[58px] flex-none items-center justify-between gap-3 border-b border-border px-5">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen aria-hidden="true" size={19} />
            {t("diff:rulesTitle")}
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label={t("common:closeDialog")}>
              <X aria-hidden="true" size={18} />
            </Button>
          </DialogClose>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 text-body [overflow-wrap:anywhere]">
          <p id="diff-rules-description" className="mb-5 text-muted-foreground">
            {t("diff:rulesDescription")}
          </p>
          {sections.map(([section, items]) => (
            <section key={section} className="mb-6 last:mb-0" aria-labelledby={`diff-rules-${section}`}>
              <h2 id={`diff-rules-${section}`} className="mb-3 font-semibold text-foreground">
                {t(`diff:rules.${section}`)}
              </h2>
              <dl className="divide-y divide-border rounded-lg border border-border px-4">
                {items.map((item) => (
                  <div key={item} className="py-3">
                    <dt className="mb-1 font-semibold text-foreground">{t(`diff:rules.${item}.title`)}</dt>
                    <dd className="m-0 leading-relaxed text-muted-foreground">{t(`diff:rules.${item}.description`)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
