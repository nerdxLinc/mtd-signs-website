import type { WorkCategory } from "../types/portfolio";
import { RouterLink } from "../router";
import { useTranslation } from "../lib/i18n";

type CategoryCardProps = {
  category: WorkCategory;
  coverImage: string;
  coverAlt: string;
  eager?: boolean;
};

export default function CategoryCard({ category, coverImage, coverAlt, eager = false }: CategoryCardProps) {
  const { categoryLabel, t } = useTranslation();
  const label = categoryLabel(category.id, category.label);
  return (
    <RouterLink
      to={`/work/${category.slug}`}
      className="group relative block aspect-[4/3] overflow-hidden bg-charcoal2 text-left"
      aria-label={`${t("browse")} ${label}`}
    >
      <img
        src={coverImage}
        alt={coverAlt}
        loading={eager ? "eager" : "lazy"}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none sm:group-hover:scale-[1.025]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/30 to-ink/10" aria-hidden="true" />
      <span className="absolute inset-x-0 bottom-0 p-3 sm:p-6">
        <span className="block max-w-[18rem] font-display text-lg font-semibold uppercase leading-[0.95] text-bone sm:text-3xl">
          {label}
        </span>
        <span className="mt-2 block h-px w-10 bg-orange transition-[width] duration-300 motion-reduce:transition-none sm:mt-3 sm:w-12 sm:group-hover:w-20" aria-hidden="true" />
      </span>
    </RouterLink>
  );
}
