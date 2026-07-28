import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePortfolioImages } from "../lib/portfolioApi";
import type { WorkCategory } from "../types/portfolio";
import { RouterLink } from "../router";
import CategorySwitcher from "../components/CategorySwitcher";
import PortfolioImageTile from "../components/PortfolioImageTile";
import { useTranslation } from "../lib/i18n";

type CategoryArchivePageProps = { category: WorkCategory };

export default function CategoryArchivePage({ category }: CategoryArchivePageProps) {
  const { categoryLabel, t } = useTranslation();
  const { images, usingDevelopmentFallback } = usePortfolioImages(category.id, "archive");
  const label = categoryLabel(category.id, category.label);
  const title = `${label} ${t("archive")}`;
  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-8 lg:py-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-5 border-b border-line pb-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <a href="/" className="font-body text-sm font-bold uppercase tracking-wide text-bone/70 transition-colors hover:text-orange">{t("home")}</a>
            <RouterLink to={`/work/${category.slug}`} className="inline-flex items-center gap-2 font-body text-sm font-bold uppercase tracking-wide text-bone transition-colors hover:text-orange"><ArrowLeft size={16} aria-hidden="true" /> {t("backToFeatured")} {label}</RouterLink>
          </div>
          <a href="/#contact" className="inline-flex items-center gap-2 font-body text-sm font-bold uppercase tracking-wide text-bone transition-colors hover:text-orange">{t("startProject")} <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
        <header className="mt-14 max-w-3xl sm:mt-20">
          <h1 className="font-display text-5xl font-semibold uppercase leading-[0.9] text-bone sm:text-7xl">{title}</h1>
          {usingDevelopmentFallback && <p className="mt-5 max-w-xl text-xs leading-relaxed text-bone/45">{t("developmentPreview")}</p>}
        </header>
        <section className="mt-12 grid grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${title} images`}>
          {images.map((image) => <PortfolioImageTile key={image.id} image={image} />)}
        </section>
        {images.length === 0 && <p className="mt-12 text-bone/60">{t("archiveSoon")}</p>}
        <CategorySwitcher activeCategoryId={category.id} activeCategorySlug={category.slug} activeCategoryLabel={label} level="archive" />
      </div>
    </main>
  );
}
