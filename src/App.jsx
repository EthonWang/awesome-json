import { translateMessage } from "./i18n/message.js";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Braces,
  CheckCircle2,
  GitCompare,
  Info,
  X,
} from "lucide-react";
import EditorPage from "./pages/EditorPage.jsx";
import DiffPage from "./pages/DiffPage.jsx";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";

export default function App() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const onDiff = location.pathname === "/diff";
  const [notice, setNotice] = useState(null);
  const dirtyRef = useRef(false);
  const toastTimer = useRef(null);

  const openInEditor = (content) => {
    editorRef.current.openTab(content);
    dirtyRef.current = true;
    navigate("/");
  };

  const showToast = useCallback((message, type = "info") => {
    clearTimeout(toastTimer.current);
    setNotice({ message, type });
    toastTimer.current = setTimeout(() => setNotice(null), 3200);
  }, []);

  useEffect(() => {
    const beforeUnload = (event) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      clearTimeout(toastTimer.current);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:p-3 focus:text-primary"
      >
        {t("common:skipContent")}
      </a>
      <div className="min-w-0">
        <header className="flex h-[var(--app-header-height)] items-center gap-5 border-b border-border bg-white px-4 max-[900px]:gap-3 max-[480px]:gap-1 max-[900px]:px-4 max-[480px]:px-2">
          <NavLink
            aria-label={t("common:home")}
            className="inline-flex flex-none items-center gap-2.5 whitespace-nowrap text-brand font-bold tracking-[-.035em] no-underline max-[760px]:text-title [&_img]:block [&_img]:size-6 [&_img]:object-contain max-[760px]:[&_img]:size-6"
            to="/"
          >
            <img
              src={import.meta.env.BASE_URL + "favicon.ico"}
              alt=""
              width="24"
              height="24"
            />
            <span className="max-[600px]:hidden" translate="no">
              Awesome JSON
            </span>
          </NavLink>
          <nav
            className="flex items-stretch self-stretch gap-1 [&_a]:inline-flex [&_a]:items-center [&_a]:gap-[9px] [&_a]:whitespace-nowrap [&_a]:border-b-[3px] [&_a]:border-transparent [&_a]:px-[18px] [&_a]:text-body [&_a]:font-semibold [&_a]:text-[#60798a] [&_a]:no-underline [&_a:hover]:bg-[#f7fafc] [&_a:hover]:text-[#284e69] [&_a.active]:border-primary [&_a.active]:text-[#315bbe] max-[760px]:[&_a]:px-[9px] max-[480px]:[&_a]:px-2 max-[760px]:[&_svg]:hidden"
            aria-label={t("common:workspace")}
          >
            <NavLink to="/" end>
              <Braces aria-hidden="true" size={18} />
              {t("common:editorNav")}
            </NavLink>
            <NavLink to="/diff">
              <GitCompare aria-hidden="true" size={18} />
              JSON Diff
            </NavLink>
          </nav>
          <LanguageSwitcher />
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto px-3 pt-2 pb-3 max-[760px]:p-2"
        >
          <div hidden={onDiff}>
            <EditorPage
              ref={editorRef}
              active={!onDiff}
              showToast={showToast}
              onDirty={() => {
                dirtyRef.current = true;
              }}
            />
          </div>
          <div hidden={!onDiff}>
            <DiffPage
              active={onDiff}
              showToast={showToast}
              onOpenEditor={openInEditor}
              onDirty={() => {
                dirtyRef.current = true;
              }}
            />
          </div>
        </main>
      </div>
      {notice && (
        <div
          className={cn(
            "fixed top-[calc(var(--app-header-height)+12px)] right-1/2 z-9 flex min-w-60 max-w-[min(640px,calc(100vw-32px))] translate-x-1/2 items-center gap-2.5 rounded-xl border border-[#cddfea] bg-[#f2f8fc] px-[15px] py-[13px] text-left text-body leading-normal text-[#345d76] shadow-[0_8px_28px_#27465d18] [&>svg]:flex-none",
            {
              "border-[#c5e5d5] bg-[#f0faf5] text-[#29674d]":
                notice.type === "success",
              "border-[#f0d2d7] bg-[#fff4f4] text-[#a04450]":
                notice.type === "error",
              "border-[#ebddb8] bg-[#fffaed] text-[#896323]":
                notice.type === "warning",
            },
          )}
          role="status"
          aria-live="polite"
        >
          {notice.type === "success" ? (
            <CheckCircle2 aria-hidden="true" size={19} />
          ) : notice.type === "error" || notice.type === "warning" ? (
            <AlertCircle aria-hidden="true" size={19} />
          ) : (
            <Info aria-hidden="true" size={19} />
          )}
          <span className="flex-1 [overflow-wrap:anywhere]">
            {translateMessage(notice.message)}
          </span>
          <Button
            variant="unstyled"
            className="grid size-7 flex-none place-items-center rounded-md border-0 bg-transparent p-0 text-inherit hover:bg-[#27465d0b]"
            aria-label={t("common:closeNotice")}
            onClick={() => {
              clearTimeout(toastTimer.current);
              setNotice(null);
            }}
          >
            <X aria-hidden="true" size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
