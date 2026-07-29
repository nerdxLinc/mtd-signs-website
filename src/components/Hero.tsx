import { ArrowRight } from "lucide-react";
import { useTranslation } from "../lib/i18n";

const transparentPixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const heroTruck640 = "/mtd-hero-truck-640.webp";
const heroTruck960 = "/mtd-hero-truck-960.webp";
const heroTruck1280 = "/mtd-hero-truck-1280.webp";
const heroTruck1600 = "/mtd-hero-truck-1600.webp";
const heroTruck2400 = "/mtd-hero-truck-2400.webp";
const logo320 = "/mtd-logo-320.webp";
const logo480 = "/mtd-logo-480.webp";
const logo640 = "/mtd-logo-640.webp";
const logo800 = "/mtd-logo-800.webp";
const logo1200 = "/mtd-logo-1200.webp";
const heroTruckSrcSet = `${transparentPixel} 1w, ${heroTruck640} 640w, ${heroTruck960} 960w, ${heroTruck1280} 1280w, ${heroTruck1600} 1600w, ${heroTruck2400} 2400w`;
const logoSrcSet = `${transparentPixel} 1w, ${logo320} 320w, ${logo480} 480w, ${logo640} 640w, ${logo800} 800w, ${logo1200} 1200w`;

export default function Hero() {
  const { t } = useTranslation();
  return (
    <section id="top" className="mtd-hero" aria-labelledby="hero-heading">
      <div className="mtd-hero__art" aria-hidden="true">
        <img
          className="mtd-hero__truck"
          src={heroTruck1600}
          srcSet={heroTruckSrcSet}
          sizes="(max-width: 640px) 1px, (max-width: 960px) 86vw, (min-width: 2089px) 1504px, 72vw"
          width="3000"
          height="1838"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          alt=""
        />
        <div className="mtd-hero__mask" />
      </div>

      <div className="mtd-hero__content">
        <img
          className="mtd-hero__logo"
          src={logo800}
          srcSet={logoSrcSet}
          sizes="(max-width: 640px) 1px, (min-width: 1740px) 400px, 23vw"
          width="3000"
          height="1702"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          alt="MTD Signs & Graphics"
        />
        <div className="mtd-hero__mobile-art" aria-hidden="true">
          <img
            className="mtd-hero__mobile-truck"
            src={heroTruck960}
            srcSet={heroTruckSrcSet}
            sizes="(min-width: 641px) 1px, (max-width: 375px) calc(100vw + 64px), 110vw"
            width="3000"
            height="1838"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            alt=""
          />
          <img
            className="mtd-hero__mobile-logo"
            src={logo480}
            srcSet={logoSrcSet}
            sizes="(min-width: 641px) 1px, (max-width: 466px) 48vw, 224px"
            width="3000"
            height="1702"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            alt=""
          />
        </div>
        <h1 id="hero-heading" className="mtd-hero__headline">
          <span>{t("heroFirst")}</span>
          <span>{t("heroMatter")}</span>
        </h1>
        <p className="mtd-hero__supporting-copy">{t("heroSupport")}</p>

        <div className="mtd-hero__actions">
          <a href="#work" className="mtd-hero__primary-action">
            {t("whatWeDo")} <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a href="#contact" className="mtd-hero__secondary-action">
            {t("startProject")} <ArrowRight size={16} className="text-blue" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
