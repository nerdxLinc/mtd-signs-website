import { json, requireAdmin, type Env } from "../../lib/access";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const email = requireAdmin(request); if (email instanceof Response) return email;
  const body = await request.json() as { batchId?: string; sourceZip?: string; filename?: string; kind?: string; content?: string };
  if (!body.batchId || !body.sourceZip || !body.filename || !body.kind) return json({ error: "Import source record details are required." }, { status: 400 });
  const batch: any = await env.DB.prepare("SELECT id FROM portfolio_imports WHERE id = ? AND imported_by = ?").bind(body.batchId, email).first();
  if (!batch) return json({ error: "Import batch not found." }, { status: 404 });
  const content = String(body.content ?? "").slice(0, 64_000);
  await env.DB.prepare("INSERT INTO import_source_records (id, import_id, source_zip, filename, kind, content) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(import_id, filename) DO UPDATE SET content = excluded.content, kind = excluded.kind").bind(crypto.randomUUID(), body.batchId, body.sourceZip, body.filename, body.kind, content).run();
  return json({ ok: true }, { status: 201 });
};
