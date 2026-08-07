import { workCategories } from "../data/workCategories";
import { RouterLink } from "../router";
import { useTranslation } from "../lib/i18n";

type CategorySwitcherProps = {
  activeCategoryId: string;
  level: "featured" | "archive" | "project";
  activeCategorySlug: string;
  activeCategoryLabel: string;
};

export default function CategorySwitcher({ activeCategoryId, level, activeCategorySlug, activeCategoryLabel }: CategorySwitcherProps) {
  const { categoryLabel, t } = useTranslation();
  const isArchive = level === "archive";
  const linksToArchive = level !== "featured";
  const categories = [...workCategories].sort((first, second) => first.displayOrder - second.displayOrder);

  return (
    <nav className="mt-12 border-t border-line pt-6" aria-label={t("categoryNavigation")}>
      <p className="font-body text-sm font-bold uppercase tracking-wide text-bone">
        {isArchive ? (
          <span>{t("seeMoreWork")}</span>
        ) : (
          <RouterLink className="transition-colors hover:text-blue focus-visible:text-blue" to={`/work/${activeCategorySlug}/archive`}>
            {t("seeMoreWork")}
          </RouterLink>
        )}
      </p>
      <p className="mt-1 font-body text-xs font-semibold uppercase tracking-[0.14em] text-blue">
        {categoryLabel(activeCategoryId, activeCategoryLabel)}
      </p>
      {linksToArchive && (
        <p className="mt-1 font-body text-xs font-bold uppercase tracking-wide text-bone/50">
          <RouterLink className="transition-colors hover:text-blue focus-visible:text-blue" to={`/work/${activeCategorySlug}`}>
            {t("viewFeatured")} {categoryLabel(activeCategoryId, activeCategoryLabel)}
          </RouterLink>
        </p>
      )}
      <p className="mt-5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-bone/45">{t("categorySwitch")}</p>
      <div className="mt-1 text-sm leading-7 text-bone/65" aria-label={t("categorySwitch")}>
        {categories.map((category, index) => (
          <span key={category.id}>
            {index > 0 && <span className="px-0.5 text-bone/25" aria-hidden="true">|</span>}
            {category.id === activeCategoryId ? (
              <span className="inline-flex min-h-11 items-center px-1.5 font-semibold text-blue" aria-current="page">{categoryLabel(category.id, category.label, true)}</span>
            ) : (
              <RouterLink className="inline-flex min-h-11 items-center px-1.5 transition-colors hover:text-bone focus-visible:text-bone" to={`/work/${category.slug}${linksToArchive ? "/archive" : ""}`}>
                {categoryLabel(category.id, category.label, true)}
              </RouterLink>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}
