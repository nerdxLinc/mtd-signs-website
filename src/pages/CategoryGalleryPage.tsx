import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePortfolioImages } from "../lib/portfolioApi";
import type { WorkCategory } from "../types/portfolio";
import { RouterLink } from "../router";
import CategorySwitcher from "../components/CategorySwitcher";
import PortfolioImageTile from "../components/PortfolioImageTile";
import { useTranslation } from "../lib/i18n";

type CategoryGalleryPageProps = { category: WorkCategory };

export default function CategoryGalleryPage({ category }: CategoryGalleryPageProps) {
  const { categoryDescription, categoryLabel, t } = useTranslation();
  const { images, usingDevelopmentFallback, loadError } = usePortfolioImages(category.id, "featured");
  const label = categoryLabel(category.id, category.label);
  const description = categoryDescription(category.id, category.description);

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-8 lg:py-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-5 border-b border-line pb-6">
          <a href="/#work" className="inline-flex items-center gap-2 font-body text-sm font-bold uppercase tracking-wide text-bone transition-colors hover:text-blue"><ArrowLeft size={16} className="text-blue" aria-hidden="true" /> {t("backToFeaturedWork")}</a>
          <a href="/#contact" className="inline-flex items-center gap-2 font-body text-sm font-bold uppercase tracking-wide text-bone transition-colors hover:text-blue">{t("startProject")} <ArrowRight size={16} className="text-blue" aria-hidden="true" /></a>
        </div>

        <header className="mt-14 max-w-3xl sm:mt-20">
          <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-blue">{t("featured")} {label}</p>
          <h1 className="mt-4 font-display text-5xl font-semibold uppercase leading-[0.9] text-bone sm:text-7xl">{label}</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-bone/70 sm:text-lg">{description}</p>
          {usingDevelopmentFallback && <p className="mt-5 max-w-xl text-xs leading-relaxed text-bone/45">{t("developmentPreview")}</p>}
        </header>

        <section className="mt-12 grid grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${t("featured")} ${label} ${t("featuredImages")}`}>
          {images.map((image) => <PortfolioImageTile key={image.id} image={image} />)}
        </section>

        {images.length === 0 && <p className="mt-12 text-bone/60">{t(loadError ? "portfolioUnavailable" : "featuredSoon")}</p>}

        <CategorySwitcher activeCategoryId={category.id} activeCategorySlug={category.slug} activeCategoryLabel={label} level="featured" />
      </div>
    </main>
  );
}
