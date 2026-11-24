import { type Env, json, requireAdmin } from "../../lib/access";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = requireAdmin(request);
  if (admin instanceof Response) return admin;
  const rows = await env.DB.prepare(`
    SELECT call_sid, caller_number, customer_name, project_details, intent, status,
      alert_sent, alert_error, created_at
    FROM phone_inquiries
    WHERE status != 'in_progress'
    ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'read' THEN 1 WHEN 'solicitation' THEN 2 WHEN 'collection' THEN 2 WHEN 'robocall' THEN 2 ELSE 3 END, created_at DESC
    LIMIT 200
  `).all();
  return json({ inquiries: rows.results }, { headers: { "cache-control": "no-store" } });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const admin = requireAdmin(request);
  if (admin instanceof Response) return admin;
  const id = new URL(request.url).searchParams.get("id");
  const body = await request.json<{ status?: string }>().catch(() => ({}));
  if (!id || !["new", "read", "archived"].includes(body.status ?? "")) {
    return json({ error: "A valid phone inquiry and status are required." }, { status: 400 });
  }
  await env.DB.prepare("UPDATE phone_inquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE call_sid = ? AND status != 'in_progress'")
    .bind(body.status, id).run();
  return json({ saved: true });
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "PATCH") return onRequestPatch(context);
  return json({ error: "Method not allowed." }, { status: 405, headers: { Allow: "GET, PATCH" } });
};
