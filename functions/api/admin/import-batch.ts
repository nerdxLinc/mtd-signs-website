import { json, requireAdmin, type Env } from "../../lib/access";
import { updateBatchCounts, upsertImportItem } from "../../lib/imports";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const email = requireAdmin(request); if (email instanceof Response) return email;
  const rows = await env.DB.prepare("SELECT id, source_name, source_size, status, imported_at, completed_at, image_count, uploaded_count, skipped_count, failed_count, duplicate_count FROM portfolio_imports WHERE imported_by = ? ORDER BY imported_at DESC LIMIT 100").bind(email).all<any>();
  return json({ batches: rows.results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const email = requireAdmin(request); if (email instanceof Response) return email;
  const body = await request.json() as { sourceName?: string; sourceSize?: number; imageCount?: number };
  if (!body.sourceName) return json({ error: "A ZIP filename is required." }, { status: 400 });
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO portfolio_imports (id, source_name, source_size, imported_by, image_count, status) VALUES (?, ?, ?, ?, ?, 'processing')").bind(id, body.sourceName, Number(body.sourceSize ?? 0), email, Number(body.imageCount ?? 0)).run();
  return json({ batchId: id }, { status: 201 });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const email = requireAdmin(request); if (email instanceof Response) return email;
  const body = await request.json() as { batchId?: string; action?: "failed" | "skipped" | "finalize" | "cancel"; filename?: string; error?: string };
  if (!body.batchId || !body.action) return json({ error: "Batch action is required." }, { status: 400 });
  const batch: any = await env.DB.prepare("SELECT id FROM portfolio_imports WHERE id = ? AND imported_by = ?").bind(body.batchId, email).first();
  if (!batch) return json({ error: "Import batch not found." }, { status: 404 });
  if ((body.action === "failed" || body.action === "skipped") && body.filename) {
    await upsertImportItem(env, { importId: body.batchId, sourceFilename: body.filename, status: body.action === "failed" ? "failed" : "skipped", error: body.error ?? null });
    await updateBatchCounts(env, body.batchId);
  }
  if (body.action === "cancel") await env.DB.prepare("UPDATE portfolio_imports SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP WHERE id = ?").bind(body.batchId).run();
  if (body.action === "finalize") {
    await updateBatchCounts(env, body.batchId);
    const counts: any = await env.DB.prepare("SELECT failed_count, duplicate_count FROM portfolio_imports WHERE id = ?").bind(body.batchId).first();
    const status = Number(counts?.failed_count ?? 0) > 0 || Number(counts?.duplicate_count ?? 0) > 0 ? "partially completed" : "completed";
    await env.DB.prepare("UPDATE portfolio_imports SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, body.batchId).run();
  }
  return json({ ok: true });
};
