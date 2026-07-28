import { useEffect, useMemo, useState } from "react";
import { getWorkCategory } from "../data/workCategories";
import { useTranslation } from "../lib/i18n";
import { projectLabelFromKey } from "../lib/projectFamilies";

const SITE_URL = "https://www.mtdsigns.com";
const DEFAULT_IMAGE = `${SITE_URL}/mtd-signs-social-preview.jpg`;

function setMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = url;
}

export default function SeoManager({ path }: { path: string }) {
  const { categoryLabel, language } = useTranslation();
  const normalizedPath = path.replace(/\/$/, "") || "/";
  const currentProjectKey = normalizedPath.startsWith("/projects/") ? normalizedPath.replace("/projects/", "") : "";
  const [resolvedProjectLabel, setResolvedProjectLabel] = useState("");

  useEffect(() => {
    if (!currentProjectKey || currentProjectKey.includes("/")) {
      setResolvedProjectLabel("");
      return;
    }
    let active = true;
    fetch(`/api/portfolio?project=${encodeURIComponent(currentProjectKey)}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((response: { images?: Array<{ projectLabel?: string }> }) => {
        if (active) setResolvedProjectLabel(response.images?.[0]?.projectLabel ?? "");
      })
      .catch(() => { if (active) setResolvedProjectLabel(""); });
    return () => { active = false; };
  }, [currentProjectKey]);

  const metadata = useMemo(() => {
    const normalized = path.replace(/\/$/, "") || "/";
    const workPath = normalized.startsWith("/work/") ? normalized.replace("/work/", "") : "";
    const isArchive = workPath.endsWith("/archive");
    const category = workPath ? getWorkCategory(workPath.replace(/\/archive$/, "")) : undefined;
    const projectKey = normalized.startsWith("/projects/") ? normalized.replace("/projects/", "") : "";
    const baseDescription = language === "es"
      ? "Letreros comerciales, rotulación de vehículos, gráficos para flotillas y diseño de identidad de MTD Signs & Graphics en Arkansas."
      : "Commercial signs, vehicle wraps, fleet graphics, and identity design by MTD Signs & Graphics in Arkansas.";

    if (normalized === "/admin") {
      return { title: "MTD Portfolio Admin", description: "Private MTD portfolio administration.", canonical: `${SITE_URL}/admin`, robots: "noindex, nofollow" };
    }
    if (category) {
      const label = categoryLabel(category.id, category.label);
      return {
        title: `${label}${isArchive ? ` ${language === "es" ? "Archivo" : "Archive"}` : ""} | MTD Signs & Graphics`,
        description: language === "es"
          ? `Vea ejemplos de ${label.toLocaleLowerCase("es")} realizados por MTD Signs & Graphics.`
          : `View ${label.toLowerCase()} completed by MTD Signs & Graphics.`,
        canonical: `${SITE_URL}/work/${category.slug}${isArchive ? "/archive" : ""}`,
        robots: "index, follow",
      };
    }
    if (projectKey && !projectKey.includes("/")) {
      const label = resolvedProjectLabel || projectLabelFromKey(projectKey);
      return {
        title: `${label} | MTD Signs & Graphics`,
        description: language === "es" ? `Vea el proyecto ${label} de MTD Signs & Graphics.` : `View the ${label} project by MTD Signs & Graphics.`,
        canonical: `${SITE_URL}/projects/${encodeURIComponent(projectKey)}`,
        robots: "index, follow",
      };
    }
    if (normalized === "/work") {
      return {
        title: language === "es" ? "Portafolio | MTD Signs & Graphics" : "Portfolio | MTD Signs & Graphics",
        description: baseDescription,
        canonical: `${SITE_URL}/work`,
        robots: "index, follow",
      };
    }
    return {
      title: language === "es"
        ? "MTD Signs & Graphics | Letreros, Rotulación y Diseño"
        : "MTD Signs & Graphics | Signs, Wraps & Design",
      description: baseDescription,
      canonical: SITE_URL,
      robots: "index, follow",
    };
  }, [categoryLabel, language, path, resolvedProjectLabel]);

  useEffect(() => {
    document.title = metadata.title;
    setCanonical(metadata.canonical);
    setMeta('meta[name="description"]', { name: "description" }, metadata.description);
    setMeta('meta[name="robots"]', { name: "robots" }, metadata.robots);
    setMeta('meta[property="og:title"]', { property: "og:title" }, metadata.title);
    setMeta('meta[property="og:description"]', { property: "og:description" }, metadata.description);
    setMeta('meta[property="og:url"]', { property: "og:url" }, metadata.canonical);
    setMeta('meta[property="og:image"]', { property: "og:image" }, DEFAULT_IMAGE);
    setMeta('meta[property="og:image:type"]', { property: "og:image:type" }, "image/jpeg");
    setMeta('meta[property="og:image:width"]', { property: "og:image:width" }, "1185");
    setMeta('meta[property="og:image:height"]', { property: "og:image:height" }, "622");
    setMeta('meta[property="og:type"]', { property: "og:type" }, "website");
    setMeta('meta[property="og:site_name"]', { property: "og:site_name" }, "MTD Signs & Graphics");
    setMeta('meta[property="og:locale"]', { property: "og:locale" }, language === "es" ? "es_US" : "en_US");
    setMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
    setMeta('meta[name="twitter:title"]', { name: "twitter:title" }, metadata.title);
    setMeta('meta[name="twitter:description"]', { name: "twitter:description" }, metadata.description);
    setMeta('meta[name="twitter:image"]', { name: "twitter:image" }, DEFAULT_IMAGE);
  }, [language, metadata]);

  return null;
}
