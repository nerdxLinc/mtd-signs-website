import { useCallback, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { PortfolioImage } from "../types/portfolio";
import { RouterLink } from "../router";
import { useTranslation } from "../lib/i18n";
import ImageLightbox from "./ImageLightbox";

type PortfolioImageTileProps = {
  image: PortfolioImage;
  showProjectLink?: boolean;
  categoryLabel?: string;
};

export default function PortfolioImageTile({ image, showProjectLink = true, categoryLabel }: PortfolioImageTileProps) {
  const { t } = useTranslation();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const hasProjectFamily = showProjectLink && image.projectKey && (image.projectCount ?? 0) > 1;
  const closeLightbox = useCallback(() => setIsLightboxOpen(false), []);

  return (
    <figure className="min-w-0">
      <button
        type="button"
        className="group block w-full cursor-zoom-in overflow-hidden text-left"
        aria-label={`${t("enlargeImage")}: ${image.altText}`}
        onClick={() => setIsLightboxOpen(true)}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
      >
        <img
          src={image.imageUrl}
          alt={image.altText}
          loading="lazy"
          draggable={false}
          className="pointer-events-none aspect-[4/3] h-full w-full select-none object-cover transition-transform duration-300 motion-reduce:transition-none sm:group-hover:scale-[1.015]"
        />
      </button>
      {(categoryLabel || hasProjectFamily) && (
        <figcaption className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-2 text-xs font-bold uppercase tracking-[0.1em]">
          {categoryLabel && <span className="text-bone/45">{categoryLabel}</span>}
          {hasProjectFamily && (
            <RouterLink to={`/projects/${image.projectKey}`} className="inline-flex min-h-9 items-center gap-1.5 text-bone/60 transition-colors hover:text-orange focus-visible:text-orange">
              {t("seeMoreProject")} <ArrowRight size={13} aria-hidden="true" />
            </RouterLink>
          )}
        </figcaption>
      )}
      <ImageLightbox
        open={isLightboxOpen}
        src={image.imageUrl}
        alt={image.altText}
        closeLabel={t("closeImage")}
        onClose={closeLightbox}
      />
    </figure>
  );
}

