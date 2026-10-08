import i18n, { supportedLanguages } from "./index.js";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const catalogs = import.meta.glob("./locales/*/*.json", {
  eager: true,
  import: "default",
});
const resources = {};
for (const [path, messages] of Object.entries(catalogs)) {
  const [, language, namespace] = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  resources[language] ??= {};
  resources[language][namespace] = messages;
}

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  supportedLngs: supportedLanguages.map(({ code }) => code),
  fallbackLng: "zh-CN",
  load: "currentOnly",
  defaultNS: "common",
  ns: ["common", "editor", "diff", "search"],
  interpolation: { escapeValue: false },
  initAsync: false,
  detection: {
    order: ["localStorage", "navigator"],
    lookupLocalStorage: "awesome-json-language",
    caches: ["localStorage"],
    convertDetectedLanguage: (language) =>
      /^zh(?:-|$)/i.test(language) ? "zh-CN" : language,
  },
});
function updateDocumentLanguage() {
  document.documentElement.lang = i18n.resolvedLanguage || "zh-CN";
}
i18n.on("languageChanged", updateDocumentLanguage);
updateDocumentLanguage();
