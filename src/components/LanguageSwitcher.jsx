import { useTranslation } from "react-i18next";
import { DropdownMenu } from "radix-ui";
import { Check, ChevronDown, Languages } from "lucide-react";
import { supportedLanguages } from "@/i18n";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  const current = supportedLanguages.find(({ code }) => code === language);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t("common:language")}
        className="ml-auto inline-flex h-8 pointer-coarse:min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-border bg-white px-2.5 text-action font-semibold text-muted-foreground hover:bg-[#f7fafc] hover:text-primary focus-visible:outline-2 focus-visible:outline-ring max-[760px]:px-2"
      >
        <Languages aria-hidden="true" size={16} className="max-[480px]:hidden" />
        <span className="max-[760px]:hidden">{current?.name}</span>
        <span className="min-[761px]:hidden">{current?.shortName}</span>
        <ChevronDown aria-hidden="true" size={13} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-40 rounded-lg border border-border bg-white p-1 shadow-[0_8px_24px_#18364b18]"
        >
          <DropdownMenu.RadioGroup
            value={language}
            onValueChange={(value) => i18n.changeLanguage(value)}
          >
            {supportedLanguages.map(({ code, name }) => (
              <DropdownMenu.RadioItem
                key={code}
                value={code}
                lang={code}
                className="flex cursor-pointer items-center justify-between gap-5 rounded-md px-3 py-2 text-body text-foreground outline-none data-[highlighted]:bg-[#eaf0ff] data-[highlighted]:text-primary"
              >
                {name}
                <DropdownMenu.ItemIndicator>
                  <Check aria-hidden="true" size={15} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
