import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "../lib/i18n";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_80%_15%,rgba(76,112,235,0.14),transparent_28%)] px-5 py-16 sm:px-8">
      <div className="w-full max-w-3xl">
        <img
          src="/mtd-logo-480.webp"
          alt="MTD Signs & Graphics"
          width="480"
          height="216"
          className="h-auto w-[min(18rem,65vw)]"
        />
        <p className="mt-10 font-body text-xs font-extrabold uppercase tracking-[0.18em] text-blue">{t("notFoundEyebrow")}</p>
        <h1 className="mt-3 font-display text-6xl font-semibold uppercase leading-[0.88] text-bone sm:text-8xl lg:text-9xl">
          {t("notFoundTitleFirst")} <span className="text-orange">{t("notFoundTitleAccent")}</span>
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-relaxed text-bone/70 sm:text-lg">{t("notFoundCopy")}</p>
        <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3" aria-label={t("notFoundEyebrow")}>
          <a href="/" className="inline-flex min-h-12 items-center gap-2 bg-orange px-5 text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-orange-dim">
            <ArrowLeft size={16} aria-hidden="true" /> {t("returnHome")}
          </a>
          <a href="/#work" className="inline-flex min-h-12 items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-bone transition-colors hover:text-blue">
            {t("viewFeaturedWork")} <ArrowRight size={16} className="text-blue" aria-hidden="true" />
          </a>
        </nav>
      </div>
    </main>
  );
}
