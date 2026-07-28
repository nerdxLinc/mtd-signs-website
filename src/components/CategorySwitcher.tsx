import { workCategories } from "../data/workCategories";
import { RouterLink } from "../router";
import { useTranslation } from "../lib/i18n";

type CategorySwitcherProps = {
  activeCategoryId: string;
  level: "featured" | "archive";
  activeCategorySlug: string;
  activeCategoryLabel: string;
};

export default function CategorySwitcher({ activeCategoryId, level, activeCategorySlug, activeCategoryLabel }: CategorySwitcherProps) {
  const { categoryLabel, t } = useTranslation();
  const isArchive = level === "archive";
  const categories = [...workCategories].sort((first, second) => first.displayOrder - second.displayOrder);

  return (
    <nav className="mt-12 border-t border-line pt-6" aria-label={t("categoryNavigation")}>
      <p className="font-body text-sm font-bold uppercase tracking-wide text-bone">
        {isArchive ? (
          <RouterLink className="transition-colors hover:text-orange focus-visible:text-orange" to={`/work/${activeCategorySlug}`}>
            {t("viewFeatured")} {categoryLabel(activeCategoryId, activeCategoryLabel)}
          </RouterLink>
        ) : (
          <RouterLink className="transition-colors hover:text-orange focus-visible:text-orange" to={`/work/${activeCategorySlug}/archive`}>
            {t("seeMoreWork")}
          </RouterLink>
        )}
      </p>
      <div className="mt-2 text-sm leading-7 text-bone/55" aria-label={t("categorySwitch")}>
        {categories.map((category, index) => (
          <span key={category.id}>
            {index > 0 && <span className="px-0.5 text-bone/25" aria-hidden="true">|</span>}
            {category.id === activeCategoryId ? (
              <span className="inline-flex min-h-11 items-center px-1.5 font-semibold text-orange" aria-current="page">{categoryLabel(category.id, category.label, true)}</span>
            ) : (
              <RouterLink className="inline-flex min-h-11 items-center px-1.5 transition-colors hover:text-bone focus-visible:text-bone" to={`/work/${category.slug}${isArchive ? "/archive" : ""}`}>
                {categoryLabel(category.id, category.label, true)}
              </RouterLink>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}
