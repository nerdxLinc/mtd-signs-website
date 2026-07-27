import { isSupportedImage, json, requireAdmin, type Env } from "../../lib/access";
import { imageUploadDetails, insertPortfolioImage, likelySameName, MAX_IMAGE_BYTES, removePortfolioImage, safeFilename, suggestedCategory, toDuplicateImage, updateBatchCounts, upsertImportItem } from "../../lib/imports";

type DuplicateAction = "keep-both" | "keep-new";

async function resolveReview(env: Env, reviewId: string, resolution: string) {
  await env.DB.prepare("UPDATE import_duplicate_reviews SET review_status = 'resolved', resolution = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?").bind(resolution, reviewId).run();
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const email = requireAdmin(request); if (email instanceof Response) return email;
  const form = await request.formData();
  const file = form.get("image");
  const batchId = String(form.get("batchId") ?? "");
  const sourceFilename = String(form.get("sourceFilename") ?? (file instanceof File ? file.name : ""));
  const sourceZip = String(form.get("sourceZip") ?? "");
  const fallbackCategory = String(form.get("category") ?? "specialty-projects");
  const action = String(form.get("duplicateAction") ?? "") as DuplicateAction;
  const reviewId = String(form.get("reviewId") ?? "");
  if (!(file instanceof File) || !batchId || !sourceFilename || !sourceZip) return json({ error: "One extracted image and its source ZIP details are required." }, { status: 400 });
  if (!isSupportedImage(file.name)) return json({ error: `${sourceFilename} is not a supported image.` }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return json({ error: `${sourceFilename} exceeds the 25 MB individual-image safety limit.` }, { status: 413 });
  const batch: any = await env.DB.prepare("SELECT id FROM portfolio_imports WHERE id = ? AND imported_by = ?").bind(batchId, email).first();
  if (!batch) return json({ error: "Import batch not found." }, { status: 404 });

  const { bytes, contentType, hash, dimensions } = await imageUploadDetails(file);
  const categoryId = suggestedCategory(sourceFilename, fallbackCategory);
  const existingRows = await env.DB.prepare("SELECT id, r2_key, source_filename, source_zip, source_size, width, height, content_hash, content_type FROM portfolio_images").all<any>();
  const exact = existingRows.results.find((row) => row.content_hash === hash);
  const potential = existingRows.results.filter((row) => row.content_hash !== hash && likelySameName(sourceFilename, row.source_filename));

  if (exact && !action) {
    const itemId = await upsertImportItem(env, { importId: batchId, sourceFilename, status: "duplicate", hash, size: file.size, width: dimensions.width, height: dimensions.height, duplicateKind: "exact" });
    const duplicateId = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO import_duplicate_reviews (id, import_id, import_item_id, duplicate_kind, existing_image_id) VALUES (?, ?, ?, 'exact', ?)").bind(duplicateId, batchId, itemId, exact.id).run();
    await updateBatchCounts(env, batchId);
    return json({ outcome: "duplicate", review: { id: duplicateId, batchId, sourceFilename, sourceZip, kind: "exact", status: "pending", existingImage: toDuplicateImage(exact), incomingImage: { filename: sourceFilename, width: dimensions.width, height: dimensions.height, size: file.size } } }, { status: 202 });
  }

  if (exact && action === "keep-both") {
    const id = await insertPortfolioImage(env, { categoryId, filename: sourceFilename, sourceZip, contentType: exact.content_type ?? contentType, hash, size: file.size, width: dimensions.width, height: dimensions.height, importId: batchId, r2Key: exact.r2_key });
    await upsertImportItem(env, { importId: batchId, sourceFilename, status: "uploaded", hash, size: file.size, width: dimensions.width, height: dimensions.height, imageId: id });
    if (reviewId) await resolveReview(env, reviewId, "keep-both");
    await updateBatchCounts(env, batchId);
    return json({ outcome: "uploaded", image: { id, filename: sourceFilename }, reusedExistingObject: true }, { status: 201 });
  }

  if (exact && action === "keep-new") {
    await removePortfolioImage(env, exact.id);
    if (reviewId) await resolveReview(env, reviewId, "keep-new-only");
  }

  const id = crypto.randomUUID();
  const r2Key = `portfolio/${id}/${safeFilename(sourceFilename)}`;
  await env.PORTFOLIO_BUCKET.put(r2Key, bytes, { httpMetadata: { contentType } });
  await insertPortfolioImage(env, { id, categoryId, filename: sourceFilename, sourceZip, contentType, hash, size: file.size, width: dimensions.width, height: dimensions.height, importId: batchId, r2Key, hidden: potential.length > 0 });
  const itemId = await upsertImportItem(env, { importId: batchId, sourceFilename, status: potential.length ? "duplicate" : "uploaded", hash, size: file.size, width: dimensions.width, height: dimensions.height, imageId: id, duplicateKind: potential.length ? "potential" : null });

  if (potential.length) {
    const duplicateId = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO import_duplicate_reviews (id, import_id, import_item_id, duplicate_kind, existing_image_id, incoming_image_id) VALUES (?, ?, ?, 'potential', ?, ?)").bind(duplicateId, batchId, itemId, potential[0].id, id).run();
    await updateBatchCounts(env, batchId);
    return json({ outcome: "duplicate", review: { id: duplicateId, batchId, sourceFilename, sourceZip, kind: "potential", status: "pending", existingImage: toDuplicateImage(potential[0]), incomingImage: { id, filename: sourceFilename, width: dimensions.width, height: dimensions.height, size: file.size, imageUrl: `/api/admin/image?id=${encodeURIComponent(id)}` } } }, { status: 202 });
  }

  await updateBatchCounts(env, batchId);
  return json({ outcome: "uploaded", image: { id, filename: sourceFilename, suggestedCategory: categoryId, status: "archive", isHidden: false } }, { status: 201 });
};

