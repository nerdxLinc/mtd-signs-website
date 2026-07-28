import { ArrowRight } from "lucide-react";
import heroTruck from "../assets/hero-truck-final.png";
import heroTruck960 from "../assets/hero-truck-final-960.webp";
import heroTruck1600 from "../assets/hero-truck-final-1600.webp";
import heroTruck2400 from "../assets/hero-truck-final-2400.webp";
import logo from "../assets/mtd-metallic-logo.png";
import logo480 from "../assets/mtd-metallic-logo-480.webp";
import logo800 from "../assets/mtd-metallic-logo-800.webp";
import logo1200 from "../assets/mtd-metallic-logo-1200.webp";
import { useTranslation } from "../lib/i18n";

const heroTruckSrcSet = `${heroTruck960} 960w, ${heroTruck1600} 1600w, ${heroTruck2400} 2400w`;
const logoSrcSet = `${logo480} 480w, ${logo800} 800w, ${logo1200} 1200w`;

export default function Hero() {
  const { t } = useTranslation();
  return (
    <section id="top" className="mtd-hero" aria-labelledby="hero-heading">
      <div className="mtd-hero__art" aria-hidden="true">
        <img
          className="mtd-hero__truck"
          src={heroTruck}
          srcSet={heroTruckSrcSet}
          sizes="(max-width: 960px) 86vw, (min-width: 2089px) 1504px, 72vw"
          width="3000"
          height="1838"
          decoding="async"
          alt=""
        />
        <div className="mtd-hero__mask" />
      </div>

      <div className="mtd-hero__content">
        <img
          className="mtd-hero__logo"
          src={logo}
          srcSet={logoSrcSet}
          sizes="(min-width: 1740px) 400px, 23vw"
          width="3000"
          height="1702"
          decoding="async"
          alt="MTD Signs & Graphics"
        />
        <div className="mtd-hero__mobile-art" aria-hidden="true">
          <img
            className="mtd-hero__mobile-truck"
            src={heroTruck}
            srcSet={heroTruckSrcSet}
            sizes="(max-width: 375px) calc(100vw + 64px), 110vw"
            width="3000"
            height="1838"
            decoding="async"
            alt=""
          />
          <img
            className="mtd-hero__mobile-logo"
            src={logo}
            srcSet={logoSrcSet}
            sizes="(max-width: 466px) 48vw, 224px"
            width="3000"
            height="1702"
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
            {t("startProject")} <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
