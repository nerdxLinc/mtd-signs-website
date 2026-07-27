import { json, type Env } from "../lib/access";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const result = await env.DB.prepare("SELECT id, testimonial_text, client_name, is_active, display_order FROM testimonials WHERE is_active = 1 ORDER BY display_order ASC, created_at ASC").all();
  return json({ testimonials: result.results.map((row: any) => ({ id: row.id, text: row.testimonial_text, clientName: row.client_name, isActive: Boolean(row.is_active), displayOrder: row.display_order })) });
};
