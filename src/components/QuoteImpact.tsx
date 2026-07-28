import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useActiveTestimonials } from "../lib/portfolioApi";
import { useTranslation } from "../lib/i18n";

export default function QuoteImpact() {
  const { t } = useTranslation();
  const { testimonials, loaded } = useActiveTestimonials();
  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const paused = hoverPaused || focusPaused;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => {
      setCanHover(media.matches);
      if (!media.matches) setHoverPaused(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || testimonials.length < 2) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % testimonials.length),
      10_000,
    );
    return () => window.clearTimeout(timer);
  }, [index, paused, reducedMotion, testimonials.length]);

  if (!loaded) return null;
  if (testimonials.length === 0) return null;
  const move = (direction: -1 | 1) => setIndex((current) => (current + direction + testimonials.length) % testimonials.length);

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-ink px-5 py-20 sm:px-8 lg:py-28"
      aria-label={t("clientTestimonials")}
      onMouseEnter={() => { if (canHover) setHoverPaused(true); }}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={(event) => {
        if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) {
          setFocusPaused(true);
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusPaused(false);
      }}
    >
      <div className="relative mx-auto max-w-3xl">
        <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-orange">{t("whatClientsSay")}</p>
        <figure className="mt-7 grid min-h-[13rem] sm:min-h-[11rem]">
          {testimonials.map((testimonial, testimonialIndex) => {
            const isActive = testimonialIndex === index % testimonials.length;
            return (
              <div
                key={testimonial.id}
                className={`col-start-1 row-start-1 transition-opacity duration-300 ${isActive ? "visible opacity-100" : "invisible opacity-0"}`}
                aria-hidden={!isActive}
              >
                <blockquote className="font-display text-3xl font-semibold uppercase leading-[1.05] text-bone sm:text-4xl lg:text-5xl">&ldquo;{testimonial.text}&rdquo;</blockquote>
                <figcaption className="mt-5 text-sm font-bold tracking-[0.12em] text-bone/60">{testimonial.clientName}</figcaption>
              </div>
            );
          })}
        </figure>
        {testimonials.length > 1 && <div className="mt-7 flex items-center gap-4">
          <button type="button" onClick={() => move(-1)} onPointerUp={(event) => { if (event.pointerType !== "mouse") event.currentTarget.blur(); }} aria-label={t("previousTestimonial")} className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center border border-line text-bone transition-colors hover:border-orange hover:text-orange"><ChevronLeft size={18} aria-hidden="true" /></button>
          <span className="min-w-14 text-center text-xs font-bold tabular-nums tracking-[0.14em] text-bone/50" aria-live="polite">{index + 1} / {testimonials.length}</span>
          <button type="button" onClick={() => move(1)} onPointerUp={(event) => { if (event.pointerType !== "mouse") event.currentTarget.blur(); }} aria-label={t("nextTestimonial")} className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center border border-line text-bone transition-colors hover:border-orange hover:text-orange"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>}
      </div>
    </section>
  );
}
