import { adminImageUrl, json, requireAdmin, type Env } from "../../lib/access";
import { projectFamiliesForRows, projectFamilyFromLabel, projectFromRow } from "../../lib/projects";

const editable = new Set(["categoryId", "status", "rank", "isCategoryCover", "isHidden", "altText", "projectLabel", "filename"]);
const categoryIds = new Set([
  "vehicle-wraps-fleet-graphics",
  "logo-identity-design",
  "commercial-branding",
  "church-ministry-graphics",
  "public-safety-graphics",
  "specialty-projects",
]);

function filenameExtension(filename: string) {
  const basename = filename.split(/[\\/]/).pop() ?? filename;
  const match = basename.match(/\.(jpe?g|png|webp|avif)$/i);
  return match ? `.${match[1].toLowerCase()}` : ".jpg";
}

function filenameSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function correctedFilename(value: unknown, currentFilename: string) {
  const basename = String(value ?? "").trim().split(/[\\/]/).pop()?.trim() ?? "";
  if (!basename || basename.length > 180 || /[\u0000-\u001f\u007f]/.test(basename)) return null;
  if (/\.[^.]+$/.test(basename) && !/\.(jpe?g|png|webp|avif)$/i.test(basename)) return null;
  return /\.(jpe?g|png|webp|avif)$/i.test(basename) ? basename : `${basename}${filenameExtension(currentFilename)}`;
}

async function saveBulkCorrections(env: Env, email: string, body: Record<string, unknown>) {
  if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string" || !id.trim())) {
    return json({ error: "Choose the photos to correct first." }, { status: 400 });
  }
  const ids = [...new Set(body.ids.map((id) => String(id).trim()))];
  if (!ids.length || ids.length > 100) return json({ error: "Choose between 1 and 100 photos at a time." }, { status: 400 });

  const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : undefined;
  if (categoryId && !categoryIds.has(categoryId)) return json({ error: "Choose a valid category." }, { status: 400 });

  const requestedProjectLabel = typeof body.projectLabel === "string" ? body.projectLabel.trim().replace(/\s+/g, " ") : "";
  const requestedProject = requestedProjectLabel ? projectFamilyFromLabel(requestedProjectLabel) : null;
  if (requestedProjectLabel.length > 120 || (requestedProjectLabel && !requestedProject)) {
    return json({ error: "Enter a valid project name no longer than 120 characters." }, { status: 400 });
  }

  const renameSequentially = body.renameSequentially === true;
  if (renameSequentially && !requestedProject) return json({ error: "Enter a project name before generating filenames." }, { status: 400 });
  if (!categoryId && !requestedProject && !renameSequentially) return json({ error: "Choose at least one correction to apply." }, { status: 400 });

  const placeholders = ids.map(() => "?").join(", ");
  const selected = await env.DB.prepare(`SELECT id, source_filename FROM portfolio_images WHERE id IN (${placeholders})`).bind(...ids).all<any>();
  const selectedById = new Map(selected.results.map((row) => [String(row.id), row]));
  if (selectedById.size !== ids.length) return json({ error: "One or more selected photos could not be found. Refresh the page and try again." }, { status: 404 });

  const width = Math.max(2, String(ids.length).length);
  const slug = requestedProject ? filenameSlug(requestedProject.label) : "";
  if (renameSequentially && !slug) return json({ error: "The project name cannot be converted into a filename." }, { status: 400 });

  const statements = ids.map((id, index) => {
    const row = selectedById.get(id)!;
    const fields: string[] = [];
    const values: unknown[] = [];
    if (categoryId) { fields.push("category_id = ?"); values.push(categoryId); }
    if (requestedProject) {
      fields.push("project_key = ?", "project_label = ?");
      values.push(requestedProject.key, requestedProject.label);
    }
    if (renameSequentially) {
      fields.push("source_filename = ?");
      values.push(`${slug}-${String(index + 1).padStart(width, "0")}${filenameExtension(String(row.source_filename ?? ""))}`);
    }
    fields.push("updated_at = CURRENT_TIMESTAMP");
    return env.DB.prepare(`UPDATE portfolio_images SET ${fields.join(", ")} WHERE id = ?`).bind(...values, id);
  });

  await env.DB.batch(statements);
  return json({ ok: true, savedBy: email, updatedCount: ids.length, renamedCount: renameSequentially ? ids.length : 0 });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = requireAdmin(request);
  if (auth instanceof Response) return auth;

  const result = await env.DB.prepare("SELECT id, category_id, status, display_rank, is_category_cover, is_hidden, source_filename, source_zip, alt_text, project_key, project_label FROM portfolio_images ORDER BY category_id, status, display_rank ASC").all();
  const families = projectFamiliesForRows(result.results);
  return json({ images: result.results.map((row: any) => { const project = families.get(String(row.id)) ?? projectFromRow(row); return { id: row.id, categoryId: row.category_id, status: row.status, rank: row.display_rank, isCategoryCover: Boolean(row.is_category_cover), isHidden: Boolean(row.is_hidden), imageUrl: adminImageUrl(row.id), altText: row.alt_text, filename: row.source_filename, sourceZip: row.source_zip, projectKey: project.key, projectLabel: project.label }; }) });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const email = requireAdmin(request);
  if (email instanceof Response) return email;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ error: "A correction request is required." }, { status: 400 });
  if (Array.isArray(body.ids)) return saveBulkCorrections(env, email, body);

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing image id" }, { status: 400 });
  const current: any = await env.DB.prepare("SELECT id, category_id, status, project_key, project_label, source_filename FROM portfolio_images WHERE id = ?").bind(id).first();
  if (!current) return json({ error: "Image not found" }, { status: 404 });

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
  if (keys.includes("categoryId")) {
    if (typeof body.categoryId !== "string" || !categoryIds.has(body.categoryId)) return json({ error: "Choose a valid category." }, { status: 400 });
    fields.push("category_id = ?");
    values.push(body.categoryId);
  }
  if (keys.includes("status") && (body.status === "featured" || body.status === "archive")) { fields.push("status = ?"); values.push(body.status); }
  if (keys.includes("rank") && Number.isFinite(body.rank)) { fields.push("display_rank = ?"); values.push(Number(body.rank)); }
  // 1 is a legacy pending-archive value which is released by the recovery
  // step above. 2 is an explicit owner hide and remains private.
  if (keys.includes("isHidden")) { fields.push("is_hidden = ?"); values.push(body.isHidden ? 2 : 0); }
  if (keys.includes("altText")) {
    const altText = String(body.altText ?? "").trim();
    if (altText.length > 300) return json({ error: "Alternative text must be 300 characters or fewer." }, { status: 400 });
    fields.push("alt_text = ?");
    values.push(altText);
  }
  if (keys.includes("projectLabel")) {
    const label = String(body.projectLabel ?? "").trim().replace(/\s+/g, " ");
    if (label.length > 120) return json({ error: "Project names must be 120 characters or fewer." }, { status: 400 });
    const project = projectFamilyFromLabel(label);
    fields.push("project_key = ?", "project_label = ?");
    values.push(project?.key ?? null, project?.label ?? null);
  }
  if (keys.includes("filename")) {
    const filename = correctedFilename(body.filename, String(current.source_filename ?? ""));
    if (!filename) return json({ error: "Use a filename no longer than 180 characters ending in JPG, JPEG, PNG, WEBP, or AVIF." }, { status: 400 });
    fields.push("source_filename = ?");
    values.push(filename);
  }
  if (body.isCategoryCover === true) {
    const categoryId = String(body.categoryId ?? current?.category_id ?? "");
    if (!categoryIds.has(categoryId)) return json({ error: "Choose a valid category." }, { status: 400 });
    await env.DB.prepare("UPDATE portfolio_images SET is_category_cover = 0 WHERE category_id = ?").bind(categoryId).run();
    // A cover must be visible to the public gallery. Imported images start
    // hidden for review, so setting a cover intentionally publishes it.
    fields.push("is_category_cover = 1", "status = 'featured'", "is_hidden = 0");
  }
  if (!fields.length) return json({ error: "Invalid values supplied" }, { status: 400 });
  fields.push("updated_at = CURRENT_TIMESTAMP");
  const statements = [env.DB.prepare(`UPDATE portfolio_images SET ${fields.join(", ")} WHERE id = ?`).bind(...values, id)];

  // Publishing one image makes the current project family visible, while
  // category, project-name, and filename corrections affect only this photo.
  const isPublishing = body.status === "featured" || body.isCategoryCover === true;
  let publishedFamilyCount = 0;
  if (isPublishing) {
    const projectRows = await env.DB.prepare("SELECT id, project_key, project_label, source_filename FROM portfolio_images").all<any>();
    const projectFamilies = projectFamiliesForRows(projectRows.results);
    const project = projectFamilies.get(String(current.id)) ?? projectFromRow(current);
    if (project.key) {
      const familyIds = projectRows.results
        .filter((row) => projectFamilies.get(String(row.id))?.key === project.key)
        .map((row) => String(row.id));
      publishedFamilyCount = familyIds.length;
      for (const familyId of familyIds) {
        statements.push(env.DB.prepare("UPDATE portfolio_images SET is_hidden = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(familyId));
      }
    }
  }
  await env.DB.batch(statements);
  return json({ ok: true, savedBy: email, publishedFamilyCount });
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
