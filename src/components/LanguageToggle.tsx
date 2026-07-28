import { useTranslation } from "../lib/i18n";

export default function LanguageToggle() {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="language-toggle" role="group" aria-label="Language selection">
      <button type="button" onClick={() => setLanguage("en")} className={language === "en" ? "is-active" : ""} aria-pressed={language === "en"}>EN</button>
      <span aria-hidden="true">/</span>
      <button type="button" onClick={() => setLanguage("es")} className={language === "es" ? "is-active" : ""} aria-pressed={language === "es"}>ES</button>
    </div>
  );
}
