import { ArrowLeft, ArrowRight } from "lucide-react";
import PortfolioImageTile from "../components/PortfolioImageTile";
import { getWorkCategory } from "../data/workCategories";
import { projectLabelFromKey } from "../lib/projectFamilies";
import { useProjectImages } from "../lib/portfolioApi";

type ProjectGalleryPageProps = { projectKey: string };

export default function ProjectGalleryPage({ projectKey }: ProjectGalleryPageProps) {
  const { images, usingDevelopmentFallback } = useProjectImages(projectKey);
  const projectLabel = images[0]?.projectLabel ?? projectLabelFromKey(projectKey);

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-8 lg:py-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-5 border-b border-line pb-6">
          <a href="/#work" className="inline-flex items-center gap-2 font-body text-sm font-bold uppercase tracking-wide text-bone transition-colors hover:text-orange"><ArrowLeft size={16} aria-hidden="true" /> Back to Work</a>
          <a href="/#contact" className="inline-flex items-center gap-2 font-body text-sm font-bold uppercase tracking-wide text-bone transition-colors hover:text-orange">Start Your Project <ArrowRight size={16} aria-hidden="true" /></a>
        </div>

        <header className="mt-14 max-w-3xl sm:mt-20">
          <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-orange">Project</p>
          <h1 className="mt-4 font-display text-5xl font-semibold uppercase leading-[0.9] text-bone sm:text-7xl">{projectLabel}</h1>
          {usingDevelopmentFallback && <p className="mt-5 max-w-xl text-xs leading-relaxed text-bone/45">Development preview using temporary local image samples. Connect Cloudflare R2 and D1 to publish the curated portfolio.</p>}
        </header>

        <section className="mt-12 grid grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${projectLabel} project images`}>
          {images.map((image) => <PortfolioImageTile key={image.id} image={image} showProjectLink={false} categoryLabel={getWorkCategory(image.categoryId)?.label} />)}
        </section>
        {images.length === 0 && <p className="mt-12 text-bone/60">Work from this project will be added soon.</p>}
      </div>
    </main>
  );
}
