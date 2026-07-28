import { workCategories } from "../data/workCategories";
import { usePortfolioImages } from "../lib/portfolioApi";
import CategoryCard from "./CategoryCard";
import { useTranslation } from "../lib/i18n";

export default function FeaturedWork() {
  const { t } = useTranslation();
  const categories = [...workCategories].sort((first, second) => first.displayOrder - second.displayOrder);
  const { images } = usePortfolioImages(undefined, undefined, true);

  return (
    <section id="work" className="bg-ink px-4 py-20 sm:px-8 lg:py-28" aria-labelledby="featured-work-heading">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-10 flex items-end gap-6">
          <div className="flex items-center gap-4">
            <h2 id="featured-work-heading" className="font-display text-2xl font-semibold uppercase text-bone sm:text-3xl">{t("featuredWork")}</h2>
            <span className="h-px w-16 bg-orange" aria-hidden="true" />
          </div>
        </div>

        <div className="featured-work-grid grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {categories.map((category, index) => {
            const categoryImages = images.filter((image) => image.categoryId === category.id && image.status === "featured" && !image.isHidden);
            const cover = categoryImages.find((image) => image.isCategoryCover) ?? categoryImages[0];
            return <CategoryCard key={category.id} category={category} coverImage={cover?.imageUrl ?? category.fallbackCoverImage} coverAlt={cover?.altText ?? `Development fallback cover for ${category.label}`} eager={index < 3} />;
          })}
        </div>
      </div>
    </section>
  );
}
