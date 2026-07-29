import { ArrowLeft, ArrowRight } from "lucide-react";
import PortfolioImageTile from "../components/PortfolioImageTile";
import { getWorkCategory } from "../data/workCategories";
import { projectLabelFromKey } from "../lib/projectFamilies";
import { useProjectImages } from "../lib/portfolioApi";
import { useTranslation } from "../lib/i18n";

type ProjectGalleryPageProps = { projectKey: string };

export default function ProjectGalleryPage({ projectKey }: ProjectGalleryPageProps) {
  const { categoryLabel, t } = useTranslation();
  const { images, usingDevelopmentFallback, loadError } = useProjectImages(projectKey);
  const projectLabel = images[0]?.projectLabel ?? projectLabelFromKey(projectKey);

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-8 lg:py-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-5 border-b border-line pb-6">
          <a href="/#work" className="inline-flex items-center gap-2 font-body text-sm font-bold uppercase tracking-wide text-bone transition-colors hover:text-blue"><ArrowLeft size={16} className="text-blue" aria-hidden="true" /> {t("backToWork")}</a>
          <a href="/#contact" className="inline-flex items-center gap-2 font-body text-sm font-bold uppercase tracking-wide text-bone transition-colors hover:text-blue">{t("startProject")} <ArrowRight size={16} className="text-blue" aria-hidden="true" /></a>
        </div>

        <header className="mt-14 max-w-3xl sm:mt-20">
          <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-blue">{t("project")}</p>
          <h1 className="mt-4 font-display text-5xl font-semibold uppercase leading-[0.9] text-bone sm:text-7xl">{projectLabel}</h1>
          {usingDevelopmentFallback && <p className="mt-5 max-w-xl text-xs leading-relaxed text-bone/45">{t("developmentPreview")}</p>}
        </header>

        <section className="mt-12 grid grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${projectLabel} ${t("project")} ${t("featuredImages")}`}>
          {images.map((image) => { const category = getWorkCategory(image.categoryId); return <PortfolioImageTile key={image.id} image={image} showProjectLink={false} categoryLabel={category ? categoryLabel(category.id, category.label) : undefined} />; })}
        </section>
        {images.length === 0 && <p className="mt-12 text-bone/60">{t(loadError ? "portfolioUnavailable" : "projectSoon")}</p>}
      </div>
    </main>
  );
}
