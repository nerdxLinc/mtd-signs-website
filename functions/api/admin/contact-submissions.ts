import { type Env, json, requireAdmin } from "../../lib/access";

async function ensureContactTable(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      project_details TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
      notification_sent INTEGER NOT NULL DEFAULT 0,
      notification_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = requireAdmin(request);
  if (admin instanceof Response) return admin;
  await ensureContactTable(env);
  const result = await env.DB.prepare(`
    SELECT id, name, email, phone, project_details, language, status,
      notification_sent, notification_error, created_at
    FROM contact_submissions
    ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'read' THEN 1 ELSE 2 END, created_at DESC
  `).all();
  return json({ inquiries: result.results });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const admin = requireAdmin(request);
  if (admin instanceof Response) return admin;
  await ensureContactTable(env);
  const id = new URL(request.url).searchParams.get("id");
  const body = await request.json<{ status?: string }>().catch(() => ({}));
  if (!id || !["new", "read", "archived"].includes(body.status ?? "")) {
    return json({ error: "A valid inquiry and status are required." }, { status: 400 });
  }
  await env.DB.prepare(
    "UPDATE contact_submissions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).bind(body.status, id).run();
  return json({ saved: true });
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "PATCH") return onRequestPatch(context);
  return json({ error: "Method not allowed." }, { status: 405, headers: { Allow: "GET, PATCH" } });
};
