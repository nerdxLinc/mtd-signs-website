import { ArrowRight } from "lucide-react";
import heroTruck from "../assets/hero-truck-final.png";
import logo from "../assets/mtd-metallic-logo.png";

export default function Hero() {
  return (
    <section id="top" className="mtd-hero" aria-labelledby="hero-heading">
      <div className="mtd-hero__art" aria-hidden="true">
        <img className="mtd-hero__truck" src={heroTruck} alt="" />
        <div className="mtd-hero__mask" />
      </div>

      <div className="mtd-hero__content">
        <img className="mtd-hero__logo" src={logo} alt="MTD Signs & Graphics" />
        <div className="mtd-hero__mobile-art" aria-hidden="true">
          <img className="mtd-hero__mobile-truck" src={heroTruck} alt="" />
          <img className="mtd-hero__mobile-logo" src={logo} alt="" />
        </div>
        <h1 id="hero-heading" className="mtd-hero__headline">
          <span>First Impressions</span>
          <span>Matter.</span>
        </h1>
        <p className="mtd-hero__supporting-copy">Signs, wraps, and graphics made to be seen.</p>

        <div className="mtd-hero__actions">
          <a href="#work" className="mtd-hero__primary-action">
            What We Do <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a href="#contact" className="mtd-hero__secondary-action">
            Start Your Project <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
