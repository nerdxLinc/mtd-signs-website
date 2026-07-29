import { useEffect, useMemo, useState } from "react";
import { getWorkCategory } from "../data/workCategories";
import { useTranslation } from "../lib/i18n";
import { projectLabelFromKey } from "../lib/projectFamilies";

const SITE_URL = "https://www.mtdsigns.com";
const DEFAULT_IMAGE = `${SITE_URL}/mtd-signs-social-preview-v2.jpg`;
const DEFAULT_IMAGE_ALT = "MTD Signs & Graphics hero featuring a custom flame-wrapped Chevrolet truck and the message First Impressions Matter.";

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
  if (!url) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = url;
}

function setRouteSchema(schema: Record<string, unknown> | undefined) {
  let element = document.head.querySelector<HTMLScriptElement>("#mtd-route-schema");
  if (!schema) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("script");
    element.id = "mtd-route-schema";
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(schema);
}

export default function SeoManager({ path, notFound = false }: { path: string; notFound?: boolean }) {
  const { categoryDescription, categoryLabel, language } = useTranslation();
  const normalizedPath = path.replace(/\/$/, "") || "/";
  const currentProjectKey = normalizedPath.startsWith("/projects/") ? normalizedPath.replace("/projects/", "") : "";
  const [resolvedProjectLabel, setResolvedProjectLabel] = useState("");
  const [resolvedProjectCategoryId, setResolvedProjectCategoryId] = useState("");

  useEffect(() => {
    if (!currentProjectKey || currentProjectKey.includes("/")) {
      setResolvedProjectLabel("");
      setResolvedProjectCategoryId("");
      return;
    }
    let active = true;
    fetch(`/api/portfolio?project=${encodeURIComponent(currentProjectKey)}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((response: { images?: Array<{ categoryId?: string; projectLabel?: string }> }) => {
        if (!active) return;
        setResolvedProjectLabel(response.images?.[0]?.projectLabel ?? "");
        setResolvedProjectCategoryId(response.images?.[0]?.categoryId ?? "");
      })
      .catch(() => {
        if (!active) return;
        setResolvedProjectLabel("");
        setResolvedProjectCategoryId("");
      });
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

    if (notFound) {
      return {
        title: language === "es" ? "Página No Encontrada | MTD Signs & Graphics" : "Page Not Found | MTD Signs & Graphics",
        description: language === "es"
          ? "La página solicitada no fue encontrada. Regrese a MTD Signs & Graphics para ver letreros, rotulación y trabajos de diseño."
          : "The requested page could not be found. Return to MTD Signs & Graphics to view signs, wraps, and design work.",
        canonical: "",
        robots: "noindex, follow",
        schema: undefined,
      };
    }
    if (normalized === "/admin") {
      return { title: "MTD Portfolio Admin", description: "Private MTD portfolio administration.", canonical: "", robots: "noindex, nofollow", schema: undefined };
    }
    if (category) {
      const label = categoryLabel(category.id, category.label);
      const description = categoryDescription(category.id, category.description);
      const canonical = `${SITE_URL}/work/${category.slug}${isArchive ? "/archive" : ""}`;
      return {
        title: `${label}${isArchive ? ` ${language === "es" ? "Archivo" : "Archive"}` : ""} | MTD Signs & Graphics`,
        description: isArchive
          ? language === "es"
            ? `Vea más ejemplos de ${label.toLocaleLowerCase("es")} realizados por MTD Signs & Graphics en Arkansas.`
            : `Browse additional ${label.toLowerCase()} completed by MTD Signs & Graphics in Arkansas.`
          : description,
        canonical,
        robots: "index, follow",
        schema: {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: language === "es" ? "Inicio" : "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: label, item: `${SITE_URL}/work/${category.slug}` },
            ...(isArchive ? [{ "@type": "ListItem", position: 3, name: language === "es" ? "Archivo" : "Archive", item: canonical }] : []),
          ],
        },
      };
    }
    if (projectKey && !projectKey.includes("/")) {
      const label = resolvedProjectLabel || projectLabelFromKey(projectKey);
      const canonical = `${SITE_URL}/projects/${encodeURIComponent(projectKey)}`;
      const projectCategory = resolvedProjectCategoryId ? getWorkCategory(resolvedProjectCategoryId) : undefined;
      const projectType = projectCategory
        ? categoryLabel(projectCategory.id, projectCategory.label).toLocaleLowerCase(language === "es" ? "es" : "en")
        : language === "es" ? "señalización y gráficos" : "signage and graphics";
      return {
        title: `${label} ${language === "es" ? "Proyecto" : "Project"} | MTD Signs & Graphics`,
        description: language === "es"
          ? `Vea el proyecto de ${projectType} de ${label}, realizado por MTD Signs & Graphics en Arkansas.`
          : `View the ${label} ${projectType} project completed by MTD Signs & Graphics in Arkansas.`,
        canonical,
        robots: "index, follow",
        schema: {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: language === "es" ? "Inicio" : "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: label, item: canonical },
          ],
        },
      };
    }
    if (normalized === "/work") {
      return {
        title: language === "es" ? "Portafolio | MTD Signs & Graphics" : "Portfolio | MTD Signs & Graphics",
        description: baseDescription,
        canonical: `${SITE_URL}/work`,
        robots: "index, follow",
        schema: undefined,
      };
    }
    return {
      title: language === "es"
        ? "MTD Signs & Graphics | Letreros, Rotulación y Diseño"
        : "MTD Signs & Graphics | Signs, Wraps & Design",
      description: baseDescription,
      canonical: `${SITE_URL}/`,
      robots: "index, follow",
      schema: undefined,
    };
  }, [categoryDescription, categoryLabel, language, notFound, path, resolvedProjectCategoryId, resolvedProjectLabel]);

  useEffect(() => {
    document.title = metadata.title;
    setCanonical(metadata.canonical);
    setMeta('meta[name="description"]', { name: "description" }, metadata.description);
    setMeta('meta[name="robots"]', { name: "robots" }, metadata.robots);
    setMeta('meta[property="og:title"]', { property: "og:title" }, metadata.title);
    setMeta('meta[property="og:description"]', { property: "og:description" }, metadata.description);
    setMeta('meta[property="og:url"]', { property: "og:url" }, metadata.canonical || `${SITE_URL}/`);
    setMeta('meta[property="og:image"]', { property: "og:image" }, DEFAULT_IMAGE);
    setMeta('meta[property="og:image:secure_url"]', { property: "og:image:secure_url" }, DEFAULT_IMAGE);
    setMeta('meta[property="og:image:type"]', { property: "og:image:type" }, "image/jpeg");
    setMeta('meta[property="og:image:width"]', { property: "og:image:width" }, "1200");
    setMeta('meta[property="og:image:height"]', { property: "og:image:height" }, "630");
    setMeta('meta[property="og:image:alt"]', { property: "og:image:alt" }, DEFAULT_IMAGE_ALT);
    setMeta('meta[property="og:type"]', { property: "og:type" }, "website");
    setMeta('meta[property="og:site_name"]', { property: "og:site_name" }, "MTD Signs & Graphics");
    setMeta('meta[property="og:locale"]', { property: "og:locale" }, language === "es" ? "es_US" : "en_US");
    setMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
    setMeta('meta[name="twitter:title"]', { name: "twitter:title" }, metadata.title);
    setMeta('meta[name="twitter:description"]', { name: "twitter:description" }, metadata.description);
    setMeta('meta[name="twitter:image"]', { name: "twitter:image" }, DEFAULT_IMAGE);
    setMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt" }, DEFAULT_IMAGE_ALT);
    setRouteSchema(metadata.schema);
  }, [language, metadata]);

  return null;
}
