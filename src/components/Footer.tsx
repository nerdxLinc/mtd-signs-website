import { useTranslation } from "../lib/i18n";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-line bg-ink px-5 py-7 sm:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p className="text-bone/50">
          © {new Date().getFullYear()} MTD Signs & Graphics. {t("allRights")}
        </p>
        <div className="flex items-center gap-5">
          <a
            href="https://www.facebook.com/MTDSigns/"
            target="_blank"
            rel="noreferrer"
            className="text-bone/70 transition-colors hover:text-blue focus-visible:text-blue"
          >
            Facebook
          </a>
          <a href="#top" className="text-bone/70 transition-colors hover:text-blue focus-visible:text-blue">
            {t("backToTop")}
          </a>
        </div>
      </div>
    </footer>
  );
}
