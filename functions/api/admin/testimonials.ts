import { json, requireAdmin, type Env } from "../../lib/access";

function map(row: any) { return { id: row.id, text: row.testimonial_text, clientName: row.client_name, isActive: Boolean(row.is_active), displayOrder: row.display_order }; }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = requireAdmin(request); if (auth instanceof Response) return auth;
  const result = await env.DB.prepare("SELECT id, testimonial_text, client_name, is_active, display_order FROM testimonials ORDER BY display_order ASC, created_at ASC").all();
  return json({ testimonials: result.results.map(map) });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = requireAdmin(request); if (auth instanceof Response) return auth;
  const body = await request.json() as { text?: string; clientName?: string; isActive?: boolean; displayOrder?: number };
  if (!body.text?.trim() || !body.clientName?.trim()) return json({ error: "Client name and testimonial text are required." }, { status: 400 });
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO testimonials (id, testimonial_text, client_name, is_active, display_order) VALUES (?, ?, ?, ?, ?)").bind(id, body.text.trim(), body.clientName.trim(), body.isActive ? 1 : 0, Number(body.displayOrder ?? 100)).run();
  return json({ testimonial: { id, text: body.text.trim(), clientName: body.clientName.trim(), isActive: Boolean(body.isActive), displayOrder: Number(body.displayOrder ?? 100) } }, { status: 201 });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const auth = requireAdmin(request); if (auth instanceof Response) return auth;
  const id = new URL(request.url).searchParams.get("id");
  const body = await request.json() as { text?: string; clientName?: string; isActive?: boolean; displayOrder?: number };
  if (!id) return json({ error: "Missing testimonial id" }, { status: 400 });
  await env.DB.prepare("UPDATE testimonials SET testimonial_text = COALESCE(?, testimonial_text), client_name = COALESCE(?, client_name), is_active = COALESCE(?, is_active), display_order = COALESCE(?, display_order), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(body.text ?? null, body.clientName ?? null, typeof body.isActive === "boolean" ? Number(body.isActive) : null, Number.isFinite(body.displayOrder) ? body.displayOrder : null, id).run();
  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const auth = requireAdmin(request); if (auth instanceof Response) return auth;
  const id = new URL(request.url).searchParams.get("id");
  const body = await request.json().catch(() => ({})) as { confirm?: boolean };
  if (!id || body.confirm !== true) return json({ error: "Explicit delete confirmation is required." }, { status: 400 });
  await env.DB.prepare("DELETE FROM testimonials WHERE id = ?").bind(id).run();
  return json({ ok: true });
};
