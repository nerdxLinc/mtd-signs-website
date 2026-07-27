import { adminImageUrl, json, requireAdmin, type Env } from "../../lib/access";
import { projectFamilyFromLabel, projectFromRow } from "../../lib/projects";

const editable = new Set(["categoryId", "status", "rank", "isCategoryCover", "isHidden", "altText", "projectLabel"]);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = requireAdmin(request);
  if (auth instanceof Response) return auth;
  const result = await env.DB.prepare("SELECT id, category_id, status, display_rank, is_category_cover, is_hidden, source_filename, source_zip, alt_text, project_key, project_label FROM portfolio_images ORDER BY category_id, status, display_rank ASC").all();
  return json({ images: result.results.map((row: any) => { const project = projectFromRow(row); return { id: row.id, categoryId: row.category_id, status: row.status, rank: row.display_rank, isCategoryCover: Boolean(row.is_category_cover), isHidden: Boolean(row.is_hidden), imageUrl: adminImageUrl(row.id), altText: row.alt_text, filename: row.source_filename, sourceZip: row.source_zip, projectKey: project.key, projectLabel: project.label }; }) });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const email = requireAdmin(request);
  if (email instanceof Response) return email;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing image id" }, { status: 400 });
  const current: any = await env.DB.prepare("SELECT category_id FROM portfolio_images WHERE id = ?").bind(id).first();
  if (!current) return json({ error: "Image not found" }, { status: 404 });
  const body = await request.json() as Record<string, unknown>;
  const keys = Object.keys(body).filter((key) => editable.has(key));
  if (!keys.length) return json({ error: "No editable values supplied" }, { status: 400 });
  const fields: string[] = [];
  const values: unknown[] = [];
  if (keys.includes("categoryId")) { fields.push("category_id = ?"); values.push(body.categoryId); }
  if (keys.includes("status") && (body.status === "featured" || body.status === "archive")) { fields.push("status = ?"); values.push(body.status); }
  if (keys.includes("rank") && Number.isFinite(body.rank)) { fields.push("display_rank = ?"); values.push(Number(body.rank)); }
  if (keys.includes("isHidden")) { fields.push("is_hidden = ?"); values.push(body.isHidden ? 1 : 0); }
  if (keys.includes("altText")) { fields.push("alt_text = ?"); values.push(String(body.altText)); }
  if (keys.includes("projectLabel")) {
    const project = projectFamilyFromLabel(String(body.projectLabel ?? ""));
    fields.push("project_key = ?", "project_label = ?");
    values.push(project?.key ?? null, project?.label ?? null);
  }
  if (body.isCategoryCover === true) {
    const categoryId = String(body.categoryId ?? current?.category_id ?? "");
    await env.DB.prepare("UPDATE portfolio_images SET is_category_cover = 0 WHERE category_id = ?").bind(categoryId).run();
    // A cover must be visible to the public gallery. Imported images start
    // hidden for review, so setting a cover intentionally publishes it.
    fields.push("is_category_cover = 1", "status = 'featured'", "is_hidden = 0");
  }
  if (!fields.length) return json({ error: "Invalid values supplied" }, { status: 400 });
  fields.push("updated_at = CURRENT_TIMESTAMP");
  await env.DB.prepare(`UPDATE portfolio_images SET ${fields.join(", ")} WHERE id = ?`).bind(...values, id).run();
  return json({ ok: true, savedBy: email });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const email = requireAdmin(request);
  if (email instanceof Response) return email;
  const id = new URL(request.url).searchParams.get("id");
  const body = await request.json().catch(() => ({})) as { confirm?: boolean };
  if (!id || body.confirm !== true) return json({ error: "Explicit delete confirmation is required." }, { status: 400 });
  const row: any = await env.DB.prepare("SELECT r2_key FROM portfolio_images WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "Image not found" }, { status: 404 });
  await env.DB.batch([env.DB.prepare("DELETE FROM portfolio_images WHERE id = ?").bind(id)]);
  await env.PORTFOLIO_BUCKET.delete(row.r2_key);
  return json({ ok: true, deletedBy: email });
};

