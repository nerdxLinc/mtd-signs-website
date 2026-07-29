import { seoCategories } from "../src/data/seoCategories";
import type { Env } from "./lib/access";
import { isHomepageOnlyAsset } from "./lib/homepageAssets";
import { projectFamiliesForRows } from "./lib/projects";
import { SITE_URL, SOCIAL_IMAGE, cleanPortfolioAltText } from "./lib/seo";

type SitemapRow = {
  id: string;
  category_id: string;
  status: "featured" | "archive";
  source_filename: string;
  alt_text: string;
  project_key?: string | null;
  project_label?: string | null;
};

type SitemapImage = {
  location: string;
  caption?: string;
};

type SitemapEntry = {
  location: string;
  images?: SitemapImage[];
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function imageForRow(row: SitemapRow): SitemapImage {
  const caption = cleanPortfolioAltText(row.alt_text);
  return {
    location: `${SITE_URL}/api/image?id=${encodeURIComponent(row.id)}`,
    ...(caption ? { caption } : {}),
  };
}

function renderEntry(entry: SitemapEntry) {
  const images = (entry.images ?? []).map((image) => [
    "    <image:image>",
    `      <image:loc>${escapeXml(image.location)}</image:loc>`,
    ...(image.caption ? [`      <image:caption>${escapeXml(image.caption)}</image:caption>`] : []),
    "    </image:image>",
  ].join("\n")).join("\n");

  return [
    "  <url>",
    `    <loc>${escapeXml(entry.location)}</loc>`,
    images,
    "  </url>",
  ].filter(Boolean).join("\n");
}

function renderSitemap(entries: SitemapEntry[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entries.map(renderEntry),
    "</urlset>",
  ].join("\n");
}

function categoryEntries(rows: SitemapRow[]): SitemapEntry[] {
  return seoCategories.flatMap((category) => {
    const categoryRows = rows.filter((row) => row.category_id === category.id);
    const featured = categoryRows.filter((row) => row.status === "featured").map(imageForRow);
    const archive = categoryRows.filter((row) => row.status === "archive").map(imageForRow);

    return [
      {
        location: `${SITE_URL}/work/${category.slug}`,
        images: featured,
      },
      {
        location: `${SITE_URL}/work/${category.slug}/archive`,
        images: archive,
      },
    ];
  });
}

function projectEntries(rows: SitemapRow[]): SitemapEntry[] {
  const families = projectFamiliesForRows(rows);
  const grouped = new Map<string, SitemapRow[]>();

  for (const row of rows) {
    const projectKey = families.get(String(row.id))?.key;
    if (!projectKey) continue;
    grouped.set(projectKey, [...(grouped.get(projectKey) ?? []), row]);
  }

  return [...grouped.entries()]
    .filter(([, projectRows]) => projectRows.length > 1)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([projectKey, projectRows]) => ({
      location: `${SITE_URL}/projects/${encodeURIComponent(projectKey)}`,
      images: projectRows.map(imageForRow),
    }));
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  let rows: SitemapRow[] = [];

  try {
    const result = await env.DB.prepare(
      "SELECT id, category_id, status, source_filename, alt_text, project_key, project_label FROM portfolio_images WHERE is_hidden = 0",
    ).all<SitemapRow>();
    rows = result.results.filter((row) => !isHomepageOnlyAsset(row.source_filename));
  } catch {
    // A temporary database failure should not make the core sitemap disappear.
    rows = [];
  }

  const entries: SitemapEntry[] = [
    {
      location: `${SITE_URL}/`,
      images: [
        {
          location: SOCIAL_IMAGE,
          caption: "MTD Signs & Graphics custom flame-wrapped Chevrolet truck",
        },
      ],
    },
    ...categoryEntries(rows),
    ...projectEntries(rows),
  ];

  return new Response(renderSitemap(entries), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
};
