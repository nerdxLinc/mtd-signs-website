import { adminImageUrl, json, requireAdmin, type Env } from "../../lib/access";
import { recoverLegacyPortfolio } from "../../lib/portfolioRecovery";
import { projectFamiliesForRows, projectFamilyFromLabel, projectFromRow } from "../../lib/projects";

const editable = new Set(["categoryId", "status", "rank", "isCategoryCover", "isHidden", "altText", "projectLabel"]);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = requireAdmin(request);
  if (auth instanceof Response) return auth;

  await recoverLegacyPortfolio(env);

  const result = await env.DB.prepare("SELECT id, category_id, status, display_rank, is_category_cover, is_hidden, source_filename, source_zip, alt_text, project_key, project_label FROM portfolio_images ORDER BY category_id, status, display_rank ASC").all();
  const families = projectFamiliesForRows(result.results);
  return json({ images: result.results.map((row: any) => { const project = families.get(String(row.id)) ?? projectFromRow(row); return { id: row.id, categoryId: row.category_id, status: row.status, rank: row.display_rank, isCategoryCover: Boolean(row.is_category_cover), isHidden: Boolean(row.is_hidden), imageUrl: adminImageUrl(row.id), altText: row.alt_text, filename: row.source_filename, sourceZip: row.source_zip, projectKey: project.key, projectLabel: project.label }; }) });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const email = requireAdmin(request);
  if (email instanceof Response) return email;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing image id" }, { status: 400 });
  const current: any = await env.DB.prepare("SELECT id, category_id, status, project_key, project_label, source_filename FROM portfolio_images WHERE id = ?").bind(id).first();
  if (!current) return json({ error: "Image not found" }, { status: 404 });
  const body = await request.json() as Record<string, unknown>;
  if (body.move === "left" || body.move === "right" || body.move === "up" || body.move === "down") {
    const columns = Math.max(1, Math.min(3, Math.floor(Number(body.columns) || 3)));
    const rows = await env.DB.prepare("SELECT id FROM portfolio_images WHERE category_id = ? AND status = ? ORDER BY display_rank ASC, id ASC").bind(current.category_id, current.status).all<any>();
    const orderedIds = rows.results.map((row) => String(row.id));
    const fromIndex = orderedIds.indexOf(id);
    if (fromIndex < 0) return json({ error: "Image order could not be found" }, { status: 404 });
    const distance = body.move === "up" || body.move === "down" ? columns : 1;
    const offset = body.move === "left" || body.move === "up" ? -distance : distance;
    const toIndex = Math.max(0, Math.min(orderedIds.length - 1, fromIndex + offset));
    if (fromIndex === toIndex) return json({ ok: true, moved: false, position: fromIndex + 1 });
    const [movedId] = orderedIds.splice(fromIndex, 1);
    orderedIds.splice(toIndex, 0, movedId);
    await env.DB.batch(orderedIds.map((imageId, index) => env.DB.prepare("UPDATE portfolio_images SET display_rank = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind((index + 1) * 10, imageId)));
    return json({ ok: true, moved: true, position: toIndex + 1, savedBy: email });
  }
  const keys = Object.keys(body).filter((key) => editable.has(key));
  if (!keys.length) return json({ error: "No editable values supplied" }, { status: 400 });
  const fields: string[] = [];
  const values: unknown[] = [];
  if (keys.includes("categoryId")) { fields.push("category_id = ?"); values.push(body.categoryId); }
  if (keys.includes("status") && (body.status === "featured" || body.status === "archive")) { fields.push("status = ?"); values.push(body.status); }
  if (keys.includes("rank") && Number.isFinite(body.rank)) { fields.push("display_rank = ?"); values.push(Number(body.rank)); }
  // 1 is a legacy pending-archive value which is released by the recovery
  // step above. 2 is an explicit owner hide and remains private.
  if (keys.includes("isHidden")) { fields.push("is_hidden = ?"); values.push(body.isHidden ? 2 : 0); }
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
  const statements = [env.DB.prepare(`UPDATE portfolio_images SET ${fields.join(", ")} WHERE id = ?`).bind(...values, id)];

  // Promoting one image should make the whole client project available to
  // browse. Related images retain their existing Featured/Archive placement;
  // only the selected image is promoted. This keeps Featured Work curated
  // while the project gallery can show the complete body of work.
  const isPublishing = body.status === "featured" || body.isCategoryCover === true;
  const projectRows = await env.DB.prepare("SELECT id, project_key, project_label, source_filename FROM portfolio_images").all<any>();
  const projectFamilies = projectFamiliesForRows(projectRows.results);
  const project = projectFamilies.get(String(current.id)) ?? projectFromRow(current);
  let publishedFamilyCount = 0;
  let recategorizedFamilyCount = 0;
  let relabeledFamilyCount = 0;
  if (keys.includes("projectLabel") && project.key) {
    const requestedProject = projectFamilyFromLabel(String(body.projectLabel ?? ""));
    const familyIds = projectRows.results
      .filter((row) => projectFamilies.get(String(row.id))?.key === project.key)
      .map((row) => String(row.id));
    relabeledFamilyCount = familyIds.length;
    for (const familyId of familyIds) {
      statements.push(env.DB.prepare("UPDATE portfolio_images SET project_key = ?, project_label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(requestedProject?.key ?? null, requestedProject?.label ?? null, familyId));
    }
  }
  if (keys.includes("categoryId") && typeof body.categoryId === "string" && project.key) {
    const familyIds = projectRows.results
      .filter((row) => projectFamilies.get(String(row.id))?.key === project.key)
      .map((row) => String(row.id));
    recategorizedFamilyCount = familyIds.length;
    for (const familyId of familyIds) {
      statements.push(env.DB.prepare("UPDATE portfolio_images SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(body.categoryId, familyId));
    }
  }
  if (isPublishing && project.key) {
    const familyIds = projectRows.results
      .filter((row) => projectFamilies.get(String(row.id))?.key === project.key)
      .map((row) => String(row.id));
    publishedFamilyCount = familyIds.length;
    for (const familyId of familyIds) {
      statements.push(env.DB.prepare("UPDATE portfolio_images SET is_hidden = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(familyId));
    }
  }
  await env.DB.batch(statements);
  return json({ ok: true, savedBy: email, publishedFamilyCount, recategorizedFamilyCount, relabeledFamilyCount });
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

