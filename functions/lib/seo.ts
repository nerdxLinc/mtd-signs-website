import { getSeoCategory } from "../../src/data/seoCategories";
import { isHomepageOnlyAsset } from "./homepageAssets";
import { normalizeProjectKey, projectFamiliesForRows } from "./projects";
import type { Env } from "./access";

export const SITE_URL = "https://www.mtdsigns.com";
export const SOCIAL_IMAGE = `${SITE_URL}/mtd-signs-social-preview-v2.jpg`;
export const SOCIAL_IMAGE_ALT = "MTD Signs & Graphics hero featuring a custom flame-wrapped Chevrolet truck and the message First Impressions Matter.";

type Breadcrumb = {
  name: string;
  url: string;
};

export type RouteSeo = {
  title: string;
  heading: string;
  description: string;
  canonical?: string;
  robots: "index, follow" | "noindex, follow" | "noindex, nofollow";
  breadcrumbs?: Breadcrumb[];
  pageType?: "CollectionPage" | "WebPage";
};

type ProjectRow = {
  id: string;
  category_id: string;
  source_filename: string;
  project_key?: string | null;
  project_label?: string | null;
};

function routeUrl(pathname: string) {
  return pathname === "/" ? `${SITE_URL}/` : `${SITE_URL}${pathname}`;
}

export function normalizePathname(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

export function homeSeo(): RouteSeo {
  return {
    title: "MTD Signs & Graphics | Signs, Wraps & Design",
    heading: "First Impressions Matter.",
    description: "Commercial signs, vehicle wraps, fleet graphics, and identity design by MTD Signs & Graphics in Arkansas.",
    canonical: `${SITE_URL}/`,
    robots: "index, follow",
    pageType: "WebPage",
  };
}

export function categorySeo(pathname: string): RouteSeo | null {
  const normalized = normalizePathname(pathname);
  const match = normalized.match(/^\/work\/([^/]+)(\/archive)?$/);
  if (!match) return null;

  const category = getSeoCategory(match[1]);
  if (!category) return null;

  const isArchive = Boolean(match[2]);
  const canonical = routeUrl(normalized);
  const pageLabel = `${category.label}${isArchive ? " Archive" : ""}`;
  const description = isArchive
    ? `Browse additional ${category.label.toLowerCase()} completed by MTD Signs & Graphics in Arkansas.`
    : category.description;

  return {
    title: `${pageLabel} | MTD Signs & Graphics`,
    heading: pageLabel,
    description,
    canonical,
    robots: "index, follow",
    pageType: "CollectionPage",
    breadcrumbs: [
      { name: "Home", url: `${SITE_URL}/` },
      { name: category.label, url: routeUrl(`/work/${category.slug}`) },
      ...(isArchive ? [{ name: "Archive", url: canonical }] : []),
    ],
  };
}

export function adminSeo(): RouteSeo {
  return {
    title: "MTD Portfolio Admin",
    heading: "Portfolio Admin",
    description: "Private MTD portfolio administration.",
    robots: "noindex, nofollow",
    pageType: "WebPage",
  };
}

export function notFoundSeo(): RouteSeo {
  return {
    title: "Page Not Found | MTD Signs & Graphics",
    heading: "Page Not Found",
    description: "The requested page could not be found. Return to MTD Signs & Graphics to view signs, wraps, and design work.",
    robots: "noindex, follow",
    pageType: "WebPage",
  };
}

function labelFromProjectKey(projectKey: string) {
  return projectKey
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

export async function projectSeo(env: Env, requestedProjectKey: string): Promise<RouteSeo | null> {
  const requestedKey = normalizeProjectKey(requestedProjectKey);
  if (!requestedKey) return null;

  const result = await env.DB.prepare(
    "SELECT id, category_id, source_filename, project_key, project_label FROM portfolio_images WHERE is_hidden = 0",
  ).all<ProjectRow>();
  const rows = result.results.filter((row) => !isHomepageOnlyAsset(row.source_filename));
  const families = projectFamiliesForRows(rows);
  const matchingRows = rows.filter((row) => families.get(String(row.id))?.key === requestedKey);
  if (matchingRows.length === 0) return null;

  const family = families.get(String(matchingRows[0].id));
  const label = family?.label?.trim() || labelFromProjectKey(requestedKey);
  const category = getSeoCategory(matchingRows[0].category_id);
  const canonical = routeUrl(`/projects/${encodeURIComponent(requestedKey)}`);
  const projectType = category?.label.toLowerCase() ?? "signage and graphics";

  return {
    title: `${label} Project | MTD Signs & Graphics`,
    heading: label,
    description: `View the ${label} ${projectType} project completed by MTD Signs & Graphics in Arkansas.`,
    canonical,
    robots: "index, follow",
    pageType: "CollectionPage",
    breadcrumbs: [
      { name: "Home", url: `${SITE_URL}/` },
      ...(category ? [{ name: category.label, url: routeUrl(`/work/${category.slug}`) }] : []),
      { name: label, url: canonical },
    ],
  };
}

export function cleanPortfolioAltText(value: unknown) {
  if (typeof value !== "string") return "";
  const cleaned = value
    .trim()
    .replace(/^(?:renamed[\\/])+/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}` : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insertBeforeHeadClose(html: string, tag: string) {
  return html.includes("</head>") ? html.replace("</head>", `    ${tag}\n  </head>`) : `${html}${tag}`;
}

function upsertMeta(html: string, attribute: "name" | "property", key: string, content: string) {
  const pattern = new RegExp(`<meta\\b[^>]*\\b${attribute}=["']${escapeRegExp(key)}["'][^>]*>`, "i");
  const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : insertBeforeHeadClose(html, tag);
}

function setCanonical(html: string, canonical?: string) {
  const pattern = /<link\b[^>]*\brel=["']canonical["'][^>]*>/i;
  if (!canonical) return html.replace(pattern, "");
  const tag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : insertBeforeHeadClose(html, tag);
}

function routeSchema(metadata: RouteSeo) {
  const graph: Record<string, unknown>[] = [];

  if (metadata.canonical && metadata.pageType) {
    graph.push({
      "@type": metadata.pageType,
      "@id": `${metadata.canonical}#page`,
      url: metadata.canonical,
      name: metadata.title.replace(" | MTD Signs & Graphics", ""),
      description: metadata.description,
      isPartOf: {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: "MTD Signs & Graphics",
      },
    });
  }

  if (metadata.breadcrumbs && metadata.breadcrumbs.length > 1) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: metadata.breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    });
  }

  return graph.length > 0 ? { "@context": "https://schema.org", "@graph": graph } : null;
}

function setRouteSchema(html: string, metadata: RouteSeo) {
  const pattern = /<script\b[^>]*\bid=["']mtd-route-schema["'][^>]*>[\s\S]*?<\/script>/i;
  const schema = routeSchema(metadata);
  if (!schema) return html.replace(pattern, "");
  const json = JSON.stringify(schema).replace(/</g, "\\u003c");
  const tag = `<script id="mtd-route-schema" type="application/ld+json">${json}</script>`;
  return pattern.test(html) ? html.replace(pattern, tag) : insertBeforeHeadClose(html, tag);
}

function setServerFallbackContent(html: string, metadata: RouteSeo) {
  const rootPattern = /<div\b[^>]*\bid=["']root["'][^>]*>\s*<\/div>/i;
  if (!rootPattern.test(html)) return html;

  const markup = [
    '<div id="root">',
    '<main data-mtd-server-fallback style="min-height:100vh;display:grid;align-content:center;background:#0a0a0a;color:#f2f0ec;padding:clamp(2rem,7vw,7rem);font-family:Inter,Arial,sans-serif">',
    '<div style="width:min(100%,58rem)">',
    '<a href="/" aria-label="MTD Signs & Graphics home"><img src="/mtd-logo-480.webp" width="480" height="216" alt="MTD Signs & Graphics" style="width:min(18rem,60vw);height:auto"></a>',
    '<p style="margin:2.5rem 0 0;color:#4c70eb;font-size:.75rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase">MTD Signs &amp; Graphics</p>',
    `<h1 style="margin:.7rem 0 0;font-family:Oswald,Impact,Arial Narrow,sans-serif;font-size:clamp(3.5rem,9vw,7rem);font-weight:600;letter-spacing:-.03em;line-height:.9;text-transform:uppercase">${escapeHtml(metadata.heading)}</h1>`,
    `<p style="max-width:44rem;margin:1.5rem 0 0;color:rgba(242,240,236,.72);font-size:clamp(1rem,2vw,1.2rem);line-height:1.65">${escapeHtml(metadata.description)}</p>`,
    '<nav aria-label="Primary navigation" style="display:flex;flex-wrap:wrap;gap:1rem 1.5rem;margin-top:2rem">',
    '<a href="/" style="color:#f2f0ec;font-size:.82rem;font-weight:800;text-decoration:none;text-transform:uppercase">Home</a>',
    '<a href="/#work" style="color:#f2f0ec;font-size:.82rem;font-weight:800;text-decoration:none;text-transform:uppercase">Featured Work</a>',
    '<a href="/#contact" style="color:#ff6d01;font-size:.82rem;font-weight:800;text-decoration:none;text-transform:uppercase">Start Your Project</a>',
    "</nav>",
    "</div>",
    "</main>",
    "</div>",
  ].join("");

  return html.replace(rootPattern, markup);
}

export function renderSeoHtml(html: string, metadata: RouteSeo, status: number) {
  const titleTag = `<title>${escapeHtml(metadata.title)}</title>`;
  let rendered = /<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, titleTag)
    : insertBeforeHeadClose(html, titleTag);

  rendered = setCanonical(rendered, metadata.canonical);
  rendered = upsertMeta(rendered, "name", "description", metadata.description);
  rendered = upsertMeta(rendered, "name", "robots", metadata.robots);
  rendered = upsertMeta(rendered, "name", "mtd-route-status", String(status));
  rendered = upsertMeta(rendered, "property", "og:title", metadata.title);
  rendered = upsertMeta(rendered, "property", "og:description", metadata.description);
  rendered = upsertMeta(rendered, "property", "og:url", metadata.canonical ?? `${SITE_URL}/`);
  rendered = upsertMeta(rendered, "property", "og:image", SOCIAL_IMAGE);
  rendered = upsertMeta(rendered, "property", "og:image:secure_url", SOCIAL_IMAGE);
  rendered = upsertMeta(rendered, "property", "og:image:type", "image/jpeg");
  rendered = upsertMeta(rendered, "property", "og:image:width", "1200");
  rendered = upsertMeta(rendered, "property", "og:image:height", "630");
  rendered = upsertMeta(rendered, "property", "og:image:alt", SOCIAL_IMAGE_ALT);
  rendered = upsertMeta(rendered, "property", "og:type", "website");
  rendered = upsertMeta(rendered, "property", "og:site_name", "MTD Signs & Graphics");
  rendered = upsertMeta(rendered, "property", "og:locale", "en_US");
  rendered = upsertMeta(rendered, "name", "twitter:card", "summary_large_image");
  rendered = upsertMeta(rendered, "name", "twitter:title", metadata.title);
  rendered = upsertMeta(rendered, "name", "twitter:description", metadata.description);
  rendered = upsertMeta(rendered, "name", "twitter:image", SOCIAL_IMAGE);
  rendered = upsertMeta(rendered, "name", "twitter:image:alt", SOCIAL_IMAGE_ALT);
  rendered = setRouteSchema(rendered, metadata);
  return setServerFallbackContent(rendered, metadata);
}
