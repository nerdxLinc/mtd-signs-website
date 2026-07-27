import { requireAdmin, type Env } from "../../lib/access";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = requireAdmin(request); if (auth instanceof Response) return auth;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("Missing image id", { status: 400 });
  const row: any = await env.DB.prepare("SELECT r2_key, content_type FROM portfolio_images WHERE id = ?").bind(id).first();
  if (!row) return new Response("Not found", { status: 404 });
  const object = await env.PORTFOLIO_BUCKET.get(row.r2_key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": row.content_type, "cache-control": "private, no-store" } });
};
