import { workCategories } from "../data/workCategories";
import { RouterLink } from "../router";

type CategorySwitcherProps = {
  activeCategoryId: string;
  level: "featured" | "archive";
  activeCategorySlug: string;
  activeCategoryLabel: string;
};

const navigationLabels: Record<string, string> = {
  "vehicle-wraps-fleet-graphics": "Vehicle Wraps",
  "logo-identity-design": "Logo & Identity",
  "commercial-branding": "Commercial Branding",
  "church-ministry-graphics": "Church & Ministry",
  "public-safety-graphics": "Public Safety",
  "specialty-projects": "Specialty Projects",
};

export default function CategorySwitcher({ activeCategoryId, level, activeCategorySlug, activeCategoryLabel }: CategorySwitcherProps) {
  const isArchive = level === "archive";
  const categories = [...workCategories].sort((first, second) => first.displayOrder - second.displayOrder);

  return (
    <nav className="mt-12 border-t border-line pt-6" aria-label="Continue exploring portfolio work">
      <p className="font-body text-sm font-bold uppercase tracking-wide text-bone">
        {isArchive ? (
          <RouterLink className="transition-colors hover:text-orange focus-visible:text-orange" to={`/work/${activeCategorySlug}`}>
            View Featured {activeCategoryLabel}
          </RouterLink>
        ) : (
          <RouterLink className="transition-colors hover:text-orange focus-visible:text-orange" to={`/work/${activeCategorySlug}/archive`}>
            See More Work Like This
          </RouterLink>
        )}
      </p>
      <div className="mt-2 text-sm leading-7 text-bone/55" aria-label="Switch portfolio category">
        {categories.map((category, index) => (
          <span key={category.id}>
            {index > 0 && <span className="px-0.5 text-bone/25" aria-hidden="true">|</span>}
            {category.id === activeCategoryId ? (
              <span className="inline-flex min-h-11 items-center px-1.5 font-semibold text-orange" aria-current="page">{navigationLabels[category.id]}</span>
            ) : (
              <RouterLink className="inline-flex min-h-11 items-center px-1.5 transition-colors hover:text-bone focus-visible:text-bone" to={`/work/${category.slug}`}>
                {navigationLabels[category.id]}
              </RouterLink>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}
