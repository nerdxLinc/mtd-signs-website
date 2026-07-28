import { type Env } from "../lib/access";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("Missing image id", { status: 400 });
  const row: any = await env.DB.prepare("SELECT r2_key, content_type FROM portfolio_images WHERE id = ? AND is_hidden = 0").bind(id).first();
  if (!row) return new Response("Not found", { status: 404 });
  const object = await env.PORTFOLIO_BUCKET.get(row.r2_key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": row.content_type, "cache-control": "public, max-age=31536000, immutable" } });
};

export const onRequestHead: PagesFunction<Env> = async ({ request, env }) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response(null, { status: 400 });
  const row: any = await env.DB.prepare("SELECT r2_key, content_type FROM portfolio_images WHERE id = ? AND is_hidden = 0").bind(id).first();
  if (!row) return new Response(null, { status: 404 });
  const object = await env.PORTFOLIO_BUCKET.head(row.r2_key);
  if (!object) return new Response(null, { status: 404 });
  return new Response(null, {
    headers: {
      "content-type": row.content_type,
      "content-length": String(object.size),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};
