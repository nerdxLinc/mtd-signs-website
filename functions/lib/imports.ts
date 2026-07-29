import { adminImageUrl, contentTypeFor, imageDimensions, sha256, type Env } from "./access";
export { likelySameName } from "./duplicateNames";
import { likelySameName } from "./duplicateNames";
import { isHomepageOnlyAsset } from "./homepageAssets";
import { projectFamilyFromFilename } from "./projects";

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const categoryIds = new Set(["vehicle-wraps-fleet-graphics", "logo-identity-design", "commercial-branding", "church-ministry-graphics", "public-safety-graphics", "specialty-projects"]);

export function suggestedCategory(filename: string, fallback: string) {
  const name = filename.toLowerCase();
  if (/(fire|police|sheriff|ems|rescue|public-safety)/.test(name)) return "public-safety-graphics";
  if (/(church|ministry|worship|baptist|fellowship|assembly|disciples|chapel|parish|congregation)/.test(name)) return "church-ministry-graphics";
  if (/(logo|identity|brand-mark|brandmark|wordmark|letterhead|business-card)/.test(name)) return "logo-identity-design";
  if (/(truck|van|trailer|vehicle|fleet|wrap|passenger-side|driver-side|rear-angle)/.test(name)) return "vehicle-wraps-fleet-graphics";
  if (/(sign|signage|pylon|monument|window|wall|display|wayfinding|storefront|awning|cabinet)/.test(name)) return "commercial-branding";
  // An uncertain name must never silently become a Vehicle Wrap. The importer
  // sends it to Specialty Projects, where it remains visible for a quick
  // owner correction instead of appearing in the wrong public category.
  return fallback === "vehicle-wraps-fleet-graphics" || !categoryIds.has(fallback) ? "specialty-projects" : fallback;
}

export function safeFilename(filename: string) {
  return filename.split("/").pop()?.replace(/[^a-zA-Z0-9._-]+/g, "-") || "portfolio-image";
}

export async function updateBatchCounts(env: Env, importId: string) {
  const counts: any = await env.DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN item_status = 'uploaded' THEN 1 ELSE 0 END) AS uploaded, SUM(CASE WHEN item_status = 'skipped' THEN 1 ELSE 0 END) AS skipped, SUM(CASE WHEN item_status = 'failed' THEN 1 ELSE 0 END) AS failed, SUM(CASE WHEN item_status = 'duplicate' THEN 1 ELSE 0 END) AS duplicates FROM portfolio_import_items WHERE import_id = ?").bind(importId).first();
  await env.DB.prepare("UPDATE portfolio_imports SET image_count = ?, uploaded_count = ?, skipped_count = ?, failed_count = ?, duplicate_count = ? WHERE id = ?").bind(Number(counts?.total ?? 0), Number(counts?.uploaded ?? 0), Number(counts?.skipped ?? 0), Number(counts?.failed ?? 0), Number(counts?.duplicates ?? 0), importId).run();
}

export async function upsertImportItem(env: Env, values: { importId: string; sourceFilename: string; status: string; hash?: string | null; size?: number | null; width?: number | null; height?: number | null; imageId?: string | null; duplicateKind?: string | null; error?: string | null }) {
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO portfolio_import_items (id, import_id, source_filename, item_status, content_hash, source_size, width, height, image_id, duplicate_kind, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(import_id, source_filename) DO UPDATE SET item_status = excluded.item_status, content_hash = excluded.content_hash, source_size = excluded.source_size, width = excluded.width, height = excluded.height, image_id = excluded.image_id, duplicate_kind = excluded.duplicate_kind, error_message = excluded.error_message, updated_at = CURRENT_TIMESTAMP").bind(id, values.importId, values.sourceFilename, values.status, values.hash ?? null, values.size ?? null, values.width ?? null, values.height ?? null, values.imageId ?? null, values.duplicateKind ?? null, values.error ?? null).run();
  const row: any = await env.DB.prepare("SELECT id FROM portfolio_import_items WHERE import_id = ? AND source_filename = ?").bind(values.importId, values.sourceFilename).first();
  return String(row?.id ?? id);
}

export async function insertPortfolioImage(env: Env, values: { id?: string; categoryId: string; filename: string; sourceZip: string; contentType: string; hash: string; size: number; width: number | null; height: number | null; importId: string; r2Key: string; hidden?: boolean }) {
  const id = values.id ?? crypto.randomUUID();
  const project = projectFamilyFromFilename(values.filename);
  const hidden = values.hidden || isHomepageOnlyAsset(values.filename);
  // Normal imports are immediately available in More Work. A potential
  // duplicate is the normal exception. Homepage-only presentation assets also
  // remain hidden if they are ever selected in the portfolio importer.
  await env.DB.prepare("INSERT INTO portfolio_images (id, category_id, status, display_rank, is_category_cover, is_hidden, r2_key, source_filename, source_zip, content_type, content_hash, source_size, width, height, alt_text, import_id, project_key, project_label) VALUES (?, ?, 'archive', 100, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, values.categoryId, hidden ? 1 : 0, values.r2Key, values.filename, values.sourceZip, values.contentType, values.hash, values.size, values.width, values.height, values.filename.replace(/[-_]+/g, " ").replace(/\.[^.]+$/, ""), values.importId, project?.key ?? null, project?.label ?? null).run();
  return id;
}

export async function removePortfolioImage(env: Env, id: string) {
  const row: any = await env.DB.prepare("SELECT r2_key FROM portfolio_images WHERE id = ?").bind(id).first();
  if (!row) return;
  await env.DB.prepare("DELETE FROM portfolio_images WHERE id = ?").bind(id).run();
  const references: any = await env.DB.prepare("SELECT COUNT(*) AS count FROM portfolio_images WHERE r2_key = ?").bind(row.r2_key).first();
  if (Number(references?.count ?? 0) === 0) await env.PORTFOLIO_BUCKET.delete(row.r2_key);
}

export async function imageUploadDetails(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = contentTypeFor(file.name);
  const hash = await sha256(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const dimensions = imageDimensions(bytes, contentType);
  return { bytes, contentType, hash, dimensions };
}

export function toDuplicateImage(row: any) {
  return { id: row.id, filename: row.source_filename, sourceZip: row.source_zip ?? undefined, width: row.width, height: row.height, size: row.source_size, imageUrl: adminImageUrl(row.id) };
}
