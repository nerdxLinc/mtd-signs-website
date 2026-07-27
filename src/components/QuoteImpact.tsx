import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useActiveTestimonials } from "../lib/portfolioApi";

export default function QuoteImpact() {
  const { testimonials, loaded } = useActiveTestimonials();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || testimonials.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % testimonials.length), 10_000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, testimonials.length]);

  if (!loaded) return null;
  if (testimonials.length === 0) {
    return (
      <section id="testimonials" className="bg-ink px-5 py-16 sm:px-8 lg:py-20" aria-label="Testimonial carousel development mode">
        <div className="mx-auto max-w-3xl border border-line bg-charcoal2 px-6 py-8 sm:px-8">
          <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-orange">Testimonials</p>
          <p className="mt-4 font-display text-2xl font-semibold uppercase leading-tight text-bone">No approved client testimonials are active yet.</p>
          <p className="mt-3 text-sm leading-relaxed text-bone/60">This carousel is ready for approved client feedback and will appear here once a testimonial is activated in the private admin area.</p>
        </div>
      </section>
    );
  }
  const testimonial = testimonials[index % testimonials.length];
  const move = (direction: -1 | 1) => setIndex((current) => (current + direction + testimonials.length) % testimonials.length);

  return (
    <section id="testimonials" className="relative overflow-hidden bg-ink px-5 py-20 sm:px-8 lg:py-28" aria-label="Client testimonials" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <div className="relative mx-auto max-w-3xl">
        <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-orange">What clients say</p>
        <figure className="mt-7 min-h-[13rem] sm:min-h-[11rem]">
          <blockquote className="font-display text-3xl font-semibold uppercase leading-[1.05] text-bone sm:text-4xl lg:text-5xl">&ldquo;{testimonial.text}&rdquo;</blockquote>
          <figcaption className="mt-5 text-sm font-bold tracking-[0.12em] text-bone/60">{testimonial.clientName}</figcaption>
        </figure>
        {testimonials.length > 1 && <div className="mt-7 flex items-center gap-4">
          <button type="button" onClick={() => move(-1)} aria-label="Previous testimonial" className="inline-flex h-10 w-10 items-center justify-center border border-line text-bone transition-colors hover:border-orange hover:text-orange"><ChevronLeft size={18} aria-hidden="true" /></button>
          <span className="text-xs font-bold tracking-[0.14em] text-bone/50" aria-live="polite">{index + 1} / {testimonials.length}</span>
          <button type="button" onClick={() => move(1)} aria-label="Next testimonial" className="inline-flex h-10 w-10 items-center justify-center border border-line text-bone transition-colors hover:border-orange hover:text-orange"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>}
      </div>
    </section>
  );
}
