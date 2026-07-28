import { json, publicImageUrl, type Env } from "../lib/access";
import { normalizeProjectKey, projectFamiliesForRows } from "../lib/projects";

function mapRows(rows: any[]) {
  const families = projectFamiliesForRows(rows);
  const mapped = rows.map((row) => {
    const project = families.get(String(row.id)) ?? {};
    return {
      id: row.id,
      categoryId: row.category_id,
      status: row.status,
      rank: row.display_rank,
      isCategoryCover: Boolean(row.is_category_cover),
      isHidden: false,
      imageUrl: publicImageUrl(row.id),
      altText: row.alt_text,
      filename: row.source_filename,
      projectKey: project.key,
      projectLabel: project.label,
      createdAt: row.created_at,
    };
  });
  const counts = new Map<string, number>();
  for (const image of mapped) {
    if (image.projectKey) counts.set(image.projectKey, (counts.get(image.projectKey) ?? 0) + 1);
  }
  return mapped.map(({ createdAt, ...image }) => ({ ...image, projectCount: image.projectKey ? counts.get(image.projectKey) ?? 0 : 0 }));
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");
  const project = url.searchParams.get("project");
  const coversOnly = url.searchParams.get("covers") === "1";
  if (status && status !== "featured" && status !== "archive") return json({ error: "Invalid status" }, { status: 400 });

  const result = await env.DB.prepare("SELECT id, category_id, status, display_rank, is_category_cover, source_filename, alt_text, project_key, project_label, created_at FROM portfolio_images WHERE is_hidden = 0").all<any>();
  let images = mapRows(result.results);

  if (coversOnly) {
    const covers = new Map<string, typeof images[number]>();
    for (const image of images.sort((first, second) =>
      Number(second.isCategoryCover) - Number(first.isCategoryCover)
      || Number(second.status === "featured") - Number(first.status === "featured")
      || first.rank - second.rank)) {
      if (!covers.has(image.categoryId)) covers.set(image.categoryId, image);
    }
    return json({ source: "cloudflare", images: [...covers.values()] });
  }

  if (category) images = images.filter((image) => image.categoryId === category);
  if (status) images = images.filter((image) => image.status === status);
  if (project) images = images.filter((image) => image.projectKey === normalizeProjectKey(project));
  images.sort((first, second) => first.rank - second.rank);
  return json({ source: "cloudflare", images });
};
