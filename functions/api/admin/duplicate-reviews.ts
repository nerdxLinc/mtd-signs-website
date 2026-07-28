import { adminImageUrl, json, requireAdmin, type Env } from "../../lib/access";
import { insertPortfolioImage, removePortfolioImage, updateBatchCounts, upsertImportItem } from "../../lib/imports";

function reviewImage(prefix: string, row: any) {
  if (!row?.id) return undefined;
  return { id: row.id, filename: row.source_filename, sourceZip: row.source_zip ?? undefined, width: row.width, height: row.height, size: row.source_size, imageUrl: adminImageUrl(row.id), prefix };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const email = requireAdmin(request); if (email instanceof Response) return email;
  const exactBatches = await env.DB.prepare("SELECT DISTINCT review.import_id FROM import_duplicate_reviews review JOIN portfolio_imports batch ON batch.id = review.import_id WHERE batch.imported_by = ? AND review.review_status = 'pending' AND review.duplicate_kind = 'exact'").bind(email).all<any>();
  await env.DB.batch([
    env.DB.prepare("UPDATE portfolio_import_items SET item_status = 'skipped', updated_at = CURRENT_TIMESTAMP WHERE id IN (SELECT review.import_item_id FROM import_duplicate_reviews review JOIN portfolio_imports batch ON batch.id = review.import_id WHERE batch.imported_by = ? AND review.review_status = 'pending' AND review.duplicate_kind = 'exact')").bind(email),
    env.DB.prepare("UPDATE import_duplicate_reviews SET review_status = 'resolved', resolution = 'automatic-exact-discard', resolved_at = CURRENT_TIMESTAMP WHERE id IN (SELECT review.id FROM import_duplicate_reviews review JOIN portfolio_imports batch ON batch.id = review.import_id WHERE batch.imported_by = ? AND review.review_status = 'pending' AND review.duplicate_kind = 'exact')").bind(email),
  ]);
  for (const batch of exactBatches.results) await updateBatchCounts(env, String(batch.import_id));
  const rows = await env.DB.prepare("SELECT review.id, review.import_id, review.duplicate_kind, review.review_status, item.source_filename, batch.source_name AS source_zip, existing.id AS existing_id, existing.source_filename AS existing_filename, existing.source_zip AS existing_source_zip, existing.width AS existing_width, existing.height AS existing_height, existing.source_size AS existing_size, incoming.id AS incoming_id, incoming.source_filename AS incoming_filename, incoming.source_zip AS incoming_source_zip, incoming.width AS incoming_width, incoming.height AS incoming_height, incoming.source_size AS incoming_size FROM import_duplicate_reviews review JOIN portfolio_imports batch ON batch.id = review.import_id JOIN portfolio_import_items item ON item.id = review.import_item_id JOIN portfolio_images existing ON existing.id = review.existing_image_id LEFT JOIN portfolio_images incoming ON incoming.id = review.incoming_image_id WHERE batch.imported_by = ? AND review.review_status = 'pending' ORDER BY review.created_at ASC").bind(email).all<any>();
  return json({ reviews: rows.results.map((row) => ({ id: row.id, batchId: row.import_id, sourceFilename: row.source_filename, sourceZip: row.source_zip, kind: row.duplicate_kind, status: row.review_status, existingImage: reviewImage("existing", { id: row.existing_id, source_filename: row.existing_filename, source_zip: row.existing_source_zip, width: row.existing_width, height: row.existing_height, source_size: row.existing_size }), incomingImage: reviewImage("incoming", { id: row.incoming_id, source_filename: row.incoming_filename ?? row.source_filename, source_zip: row.incoming_source_zip, width: row.incoming_width, height: row.incoming_height, source_size: row.incoming_size }) })) });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const email = requireAdmin(request); if (email instanceof Response) return email;
  const body = await request.json() as { reviewId?: string; action?: "keep-existing-only" | "keep-new-only" | "keep-both" | "use-existing-in-category"; categoryId?: string };
  if (!body.reviewId || !body.action) return json({ error: "A duplicate decision is required." }, { status: 400 });
  const review: any = await env.DB.prepare("SELECT review.id, review.import_id, review.import_item_id, review.duplicate_kind, review.existing_image_id, review.incoming_image_id, item.source_filename, batch.source_name FROM import_duplicate_reviews review JOIN portfolio_import_items item ON item.id = review.import_item_id JOIN portfolio_imports batch ON batch.id = review.import_id WHERE review.id = ? AND batch.imported_by = ? AND review.review_status = 'pending'").bind(body.reviewId, email).first();
  if (!review) return json({ error: "Duplicate review not found." }, { status: 404 });
  const existing: any = await env.DB.prepare("SELECT * FROM portfolio_images WHERE id = ?").bind(review.existing_image_id).first();
  const incoming: any = review.incoming_image_id ? await env.DB.prepare("SELECT * FROM portfolio_images WHERE id = ?").bind(review.incoming_image_id).first() : undefined;

  if ((body.action === "keep-new-only" || body.action === "keep-both") && !incoming) return json({ error: "Re-open the original ZIP and choose this decision again so the browser can send that one image. The ZIP itself is never uploaded." }, { status: 409 });
  if (body.action === "keep-existing-only") {
    if (incoming) await removePortfolioImage(env, incoming.id);
    await upsertImportItem(env, { importId: review.import_id, sourceFilename: review.source_filename, status: "skipped", imageId: null });
  }
  if (body.action === "keep-new-only") {
    await removePortfolioImage(env, existing.id);
    await upsertImportItem(env, { importId: review.import_id, sourceFilename: review.source_filename, status: "uploaded", imageId: incoming.id });
  }
  if (body.action === "keep-both") await upsertImportItem(env, { importId: review.import_id, sourceFilename: review.source_filename, status: "uploaded", imageId: incoming.id });
  if (body.action === "use-existing-in-category") {
    const categoryId = body.categoryId || existing.category_id;
    await insertPortfolioImage(env, { categoryId, filename: review.source_filename, sourceZip: review.source_name, contentType: existing.content_type, hash: existing.content_hash, size: existing.source_size ?? 0, width: existing.width, height: existing.height, importId: review.import_id, r2Key: existing.r2_key });
    if (incoming) await removePortfolioImage(env, incoming.id);
    await upsertImportItem(env, { importId: review.import_id, sourceFilename: review.source_filename, status: "uploaded" });
  }
  await env.DB.prepare("UPDATE import_duplicate_reviews SET review_status = 'resolved', resolution = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?").bind(body.action, review.id).run();
  await updateBatchCounts(env, review.import_id);
  return json({ ok: true });
};

