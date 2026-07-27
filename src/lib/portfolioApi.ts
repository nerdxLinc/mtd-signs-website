import { useEffect, useMemo, useState } from "react";
import { developmentPortfolioImages } from "../data/devPortfolio";
import type { PortfolioImage, PortfolioStatus, TestimonialRecord } from "../types/portfolio";
import { addProjectFamilies, normalizeProjectKey } from "./projectFamilies";

type PortfolioResponse = { images: PortfolioImage[]; source?: "cloudflare" | "development" };

export function usePortfolioImages(categoryId?: string, status?: PortfolioStatus, coversOnly = false) {
  const fallback = useMemo(() => addProjectFamilies(developmentPortfolioImages)
    .filter((image) => (!categoryId || image.categoryId === categoryId) && (!status || image.status === status))
    .sort((a, b) => a.rank - b.rank), [categoryId, status]);
  const [images, setImages] = useState<PortfolioImage[]>(fallback);
  const [usingDevelopmentFallback, setUsingDevelopmentFallback] = useState(true);

  useEffect(() => {
    const search = new URLSearchParams();
    if (categoryId) search.set("category", categoryId);
    if (status) search.set("status", status);
    if (coversOnly) search.set("covers", "1");
    let active = true;
    fetch(`/api/portfolio?${search.toString()}`)
      .then((response) => response.ok ? response.json() as Promise<PortfolioResponse> : Promise.reject())
      .then((response) => {
        if (!active) return;
        setImages(addProjectFamilies(response.images));
        setUsingDevelopmentFallback(response.source !== "cloudflare");
      })
      .catch(() => {
        if (!active) return;
        setImages(fallback);
        setUsingDevelopmentFallback(true);
      });
    return () => { active = false; };
  }, [categoryId, coversOnly, fallback, status]);

  return { images, usingDevelopmentFallback };
}

export function useProjectImages(projectKey: string) {
  const normalizedKey = normalizeProjectKey(projectKey);
  const fallback = useMemo(() => addProjectFamilies(developmentPortfolioImages)
    .filter((image) => image.projectKey === normalizedKey)
    .sort((a, b) => a.rank - b.rank), [normalizedKey]);
  const [images, setImages] = useState<PortfolioImage[]>(fallback);
  const [usingDevelopmentFallback, setUsingDevelopmentFallback] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/portfolio?project=${encodeURIComponent(normalizedKey)}`)
      .then((response) => response.ok ? response.json() as Promise<PortfolioResponse> : Promise.reject())
      .then((response) => {
        if (!active) return;
        setImages(addProjectFamilies(response.images));
        setUsingDevelopmentFallback(response.source !== "cloudflare");
      })
      .catch(() => {
        if (!active) return;
        setImages(fallback);
        setUsingDevelopmentFallback(true);
      });
    return () => { active = false; };
  }, [fallback, normalizedKey]);

  return { images, usingDevelopmentFallback };
}

export function useActiveTestimonials() {
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/testimonials")
      .then((response) => response.ok ? response.json() as Promise<{ testimonials: TestimonialRecord[] }> : Promise.reject())
      .then((response) => { if (active) setTestimonials(response.testimonials); })
      .catch(() => { if (active) setTestimonials([]); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  return { testimonials, loaded };
}
