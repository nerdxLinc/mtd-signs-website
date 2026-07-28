import type { Env } from "./access";
import { suggestedCategory } from "./imports";

/**
 * Repairs records created under the original Admin workflow, which kept every
 * Archive item hidden and used Vehicle Wraps as an implicit fallback. New
 * imports do neither. Running this during a portfolio read makes the existing
 * collection recover itself as soon as the fixed site is deployed.
 */
export async function recoverLegacyPortfolio(env: Env) {
  await env.DB.prepare("UPDATE portfolio_images SET is_hidden = 0, updated_at = CURRENT_TIMESTAMP WHERE status = 'archive' AND is_hidden = 1").run();

  const rows = await env.DB.prepare("SELECT id, category_id, source_filename FROM portfolio_images").all<any>();
  const strongAutomaticCategories = new Set([
    "church-ministry-graphics",
    "public-safety-graphics",
    "logo-identity-design",
  ]);
  const fixes = rows.results
    .map((row) => {
      const currentCategory = String(row.category_id ?? "specialty-projects");
      const categoryId = suggestedCategory(String(row.source_filename ?? ""), currentCategory);
      return { id: String(row.id), currentCategory, categoryId };
    })
    // Correct legacy Vehicle Wrap fallbacks as before. Also let a clear
    // church, public-safety, or logo identifier take priority over generic
    // commercial-signage words such as "wall" or "wayfinding". This moves
    // files like Perryville First Assembly into Church & Ministry.
    .filter((row) => row.categoryId !== row.currentCategory && (
      row.currentCategory === "vehicle-wraps-fleet-graphics"
      || strongAutomaticCategories.has(row.categoryId)
    ));
  if (fixes.length) {
    await env.DB.batch(fixes.map((row) => env.DB.prepare("UPDATE portfolio_images SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(row.categoryId, row.id)));
  }
}
